import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../main.dart' show appNavigatorKey;
import '../presentation/providers/auth_provider.dart';
import '../presentation/screens/cliente/cliente_tramites_screen.dart';
import '../presentation/screens/cliente/politicas_list_screen.dart';
import '../presentation/screens/funcionario/funcionario_bandeja_screen.dart';
import '../presentation/screens/login/login_screen.dart';
import '../presentation/screens/shared/notificaciones_screen.dart';
import '../presentation/screens/shared/tramite_detalle_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);

  return GoRouter(
    navigatorKey: appNavigatorKey,
    refreshListenable: notifier,
    initialLocation: '/login',
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      // While loading stored session, stay put.
      if (authState.isLoading) return null;

      final user = authState.valueOrNull;
      final isLogin = state.matchedLocation == '/login';

      if (user == null) {
        return isLogin ? null : '/login';
      }
      if (isLogin) {
        final rol = user.rolNombre;
        if (rol == 'CLIENTE') return '/cliente/tramites';
        return '/funcionario/bandeja';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),

      // ── Cliente ────────────────────────────────────────────────────────────
      GoRoute(
        path: '/cliente/tramites',
        builder: (_, __) => const ClienteTramitesScreen(),
        routes: [
          GoRoute(
            path: 'nuevo',
            builder: (_, __) => const PoliticasListScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (_, state) => TramiteDetalleScreen(
              tramiteId: state.pathParameters['id']!,
            ),
          ),
        ],
      ),

      // ── Funcionario ────────────────────────────────────────────────────────
      GoRoute(
        path: '/funcionario/bandeja',
        builder: (_, __) => const FuncionarioBandejaScreen(),
        routes: [
          GoRoute(
            path: 'tramites/:id',
            builder: (_, state) => TramiteDetalleScreen(
              tramiteId: state.pathParameters['id']!,
            ),
          ),
        ],
      ),

      // ── Notificaciones ─────────────────────────────────────────────────────
      GoRoute(
        path: '/notificaciones',
        builder: (_, __) => const NotificacionesScreen(),
      ),

      // ── Deep link universal para notificaciones push ───────────────────────
      // Permite navegar a /tramites/:id sin conocer el rol actual.
      GoRoute(
        path: '/tramites/:id',
        builder: (_, state) => TramiteDetalleScreen(
          tramiteId: state.pathParameters['id']!,
        ),
      ),
    ],
  );
});

/// Bridges Riverpod auth state changes into go_router's [Listenable] refresh.
class _RouterNotifier extends ChangeNotifier {
  _RouterNotifier(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
