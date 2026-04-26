import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router.dart';

/// Top-level background message handler — must be a top-level function.
/// Navigation from terminated state is handled in [_WorkflowAppState.initState].
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Background isolate: only log. No UI operations allowed here.
  debugPrint('[FCM] Mensaje en background: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Silently skip Firebase init if google-services.json / GoogleService-Info.plist
  // are not yet present (avoids crashing the app during development).
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('[FCM] Firebase no configurado: $e');
  }

  runApp(
    const ProviderScope(
      child: WorkflowApp(),
    ),
  );
}

class WorkflowApp extends ConsumerStatefulWidget {
  const WorkflowApp({super.key});

  @override
  ConsumerState<WorkflowApp> createState() => _WorkflowAppState();
}

class _WorkflowAppState extends ConsumerState<WorkflowApp> {
  @override
  void initState() {
    super.initState();
    _setupFcmHandlers();
  }

  void _setupFcmHandlers() {
    // ── Foreground ────────────────────────────────────────────────────────────
    // App is open: show a SnackBar with an optional "Ver" action to navigate.
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final context = navigatorKey.currentContext;
      if (context == null) return;

      final title = message.notification?.title ?? 'Nueva notificación';
      final tramiteId = message.data['tramiteId'];

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(title),
          duration: const Duration(seconds: 5),
          action: (tramiteId != null && tramiteId.isNotEmpty)
              ? SnackBarAction(
                  label: 'Ver',
                  onPressed: () =>
                      ref.read(routerProvider).push('/tramites/$tramiteId'),
                )
              : null,
        ),
      );
    });

    // ── Background tap ────────────────────────────────────────────────────────
    // User tapped the system notification while app was in background.
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      final tramiteId = message.data['tramiteId'];
      if (tramiteId != null && tramiteId.isNotEmpty) {
        ref.read(routerProvider).push('/tramites/$tramiteId');
      }
    });

    // ── Terminated ────────────────────────────────────────────────────────────
    // App was launched by tapping a notification from a closed state.
    FirebaseMessaging.instance.getInitialMessage().then((message) {
      if (message == null) return;
      final tramiteId = message.data['tramiteId'];
      if (tramiteId != null && tramiteId.isNotEmpty) {
        // Delay so the router finishes its first frame before navigating.
        Future.delayed(const Duration(milliseconds: 500), () {
          ref.read(routerProvider).push('/tramites/$tramiteId');
        });
      }
    });
  }

  // Exposed so the SnackBar lookup can reach the active [BuildContext].
  static final navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Workflow',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1565C0),
        ),
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
