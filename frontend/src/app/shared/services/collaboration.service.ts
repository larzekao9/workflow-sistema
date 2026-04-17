import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, interval, Subscription } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { Collaborator } from '../models/collaborator.model';
import { AuthService } from './auth.service';
import { SKIP_AUTH_LOGOUT } from '../interceptors/jwt.interceptor';

/** HttpContext compartido para todas las requests de colaboración (polling de presencia y BPMN) */
const BACKGROUND_CTX = new HttpContext().set(SKIP_AUTH_LOGOUT, true);

export interface BpmnUpdate {
  bpmnXml: string;
  bpmnVersion: number;
  savedByEmail: string;
}

@Injectable({ providedIn: 'root' })
export class CollaborationService implements OnDestroy {

  private stompClient: Client | null = null;
  private collaborators$ = new BehaviorSubject<Collaborator[]>([]);
  private bpmnUpdate$ = new Subject<BpmnUpdate>();
  private currentPolicyId: string | null = null;
  private pollSubscription: Subscription | null = null;

  private readonly apiUrl = `${environment.apiUrl}/policies`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  get collaborators(): Observable<Collaborator[]> {
    return this.collaborators$.asObservable();
  }

  /** Emite cuando otro colaborador guarda el diagrama */
  get bpmnUpdates(): Observable<BpmnUpdate> {
    return this.bpmnUpdate$.asObservable();
  }

  join(policyId: string): void {
    this.currentPolicyId = policyId;
    this.connectWebSocket(policyId);

    // Registrar presencia y obtener lista actual
    this.http.post<Collaborator[]>(`${this.apiUrl}/${policyId}/join`, {}, { context: BACKGROUND_CTX }).subscribe({
      next: (collaborators) => this.ngZone.run(() => this.collaborators$.next(collaborators)),
      error: () => {}
    });

    // Polling de respaldo cada 5s: garantiza convergencia aunque se pierdan broadcasts WS
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = interval(5000).subscribe(() => {
      if (!this.currentPolicyId) return;
      this.http.get<Collaborator[]>(`${this.apiUrl}/${policyId}/collaborators`, { context: BACKGROUND_CTX }).subscribe({
        next: (collaborators) => this.ngZone.run(() => this.collaborators$.next(collaborators)),
        error: () => {}
      });
    });
  }

  leave(policyId: string): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.http.post(`${this.apiUrl}/${policyId}/leave`, null, {
        params: { userId: user.id },
        context: BACKGROUND_CTX
      }).subscribe({ error: () => {} });
    }
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this.disconnectWebSocket();
    this.collaborators$.next([]);
    this.currentPolicyId = null;
  }

  getCollaborators(policyId: string): Observable<Collaborator[]> {
    return this.http.get<Collaborator[]>(`${this.apiUrl}/${policyId}/collaborators`, { context: BACKGROUND_CTX });
  }

  private connectWebSocket(policyId: string): void {
    const token = this.authService.getToken();
    if (!token) return;

    this.disconnectWebSocket();

    this.stompClient = new Client({
      brokerURL: environment.wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      // Heartbeat cada 5s: evita que Docker (timeout TCP de ~60s) cierre la conexión idle
      heartbeatIncoming: 5000,
      heartbeatOutgoing: 5000,
      onConnect: () => {
        console.log('[Collaboration] WebSocket conectado, policyId:', policyId);
        // Suscribir a topics ANTES de re-registrar presencia
        this.stompClient?.subscribe(
          `/topic/policy/${policyId}/collaborators`,
          (msg: IMessage) => {
            try {
              const collaborators: Collaborator[] = JSON.parse(msg.body);
              // ngZone.run garantiza que Angular detecte el cambio aunque el
              // callback de @stomp/stompjs llegue fuera de la zona de Angular
              this.ngZone.run(() => this.collaborators$.next(collaborators));
            } catch (e) {
              console.error('[Collaboration] Error parseando mensaje de presencia:', e, msg.body);
            }
          }
        );

        this.stompClient?.subscribe(
          `/topic/policy/${policyId}/bpmn`,
          (msg: IMessage) => {
            try {
              const update: BpmnUpdate = JSON.parse(msg.body);
              const currentEmail = this.authService.getCurrentUser()?.email;
              // Propagar si: no sabemos quién somos (currentEmail null) O lo guardó OTRO usuario
              // Nunca propagar si lo guardamos nosotros mismos (evita loop)
              if (!currentEmail || update.savedByEmail !== currentEmail) {
                console.log('[Collaboration] BPMN update recibido vía WS de:', update.savedByEmail, 'v', update.bpmnVersion);
                this.ngZone.run(() => this.bpmnUpdate$.next(update));
              }
            } catch (e) {
              console.error('[Collaboration] Error parseando update BPMN:', e, msg.body);
            }
          }
        );

        // Re-registrar presencia tras reconexión (necesario si backend se reinició)
        // y forzar un broadcast para que otros reciban la lista actualizada
        this.http.post<Collaborator[]>(`${this.apiUrl}/${policyId}/join`, {}, { context: BACKGROUND_CTX }).subscribe({
          next: (collaborators) => this.ngZone.run(() => this.collaborators$.next(collaborators)),
          error: () => {}
        });
      },
      // No limpiar la lista en error: la lista HTTP sigue siendo válida
      // El reconnectDelay la actualizará cuando el WS se recupere
      onStompError: (frame) => {
        console.warn('[CollaborationService] STOMP error:', frame.headers?.['message']);
      }
    });

    this.stompClient.activate();
  }

  private disconnectWebSocket(): void {
    // Siempre deactivate() independientemente de .active:
    // cuando la sesión está en error/reconexión .active=false pero el timer
    // interno de stompjs sigue corriendo — deactivate() lo cancela en cualquier estado.
    const client = this.stompClient;
    this.stompClient = null;
    client?.deactivate();
  }

  getInitials(nombreCompleto: string): string {
    return nombreCompleto
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
    this.disconnectWebSocket();
  }
}
