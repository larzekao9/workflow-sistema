import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/chat_message.dart';
import '../../data/services/api_exception.dart';
import '../../data/services/chat_service.dart';
import '../../data/services/fcm_service.dart';
import 'providers.dart';

final chatServiceProvider = Provider<ChatService>((ref) {
  return ChatService(jwtStorage: ref.watch(jwtStorageProvider));
});

class ChatState {
  final List<ChatMessage> messages;
  final bool isLoading;
  final String? error;
  final bool formSubmitted;

  const ChatState({
    this.messages = const [],
    this.isLoading = false,
    this.error,
    this.formSubmitted = false,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isLoading,
    String? error,
    bool? formSubmitted,
  }) =>
      ChatState(
        messages: messages ?? this.messages,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        formSubmitted: formSubmitted ?? this.formSubmitted,
      );
}

class ChatNotifier extends Notifier<ChatState> {
  static const String _welcome =
      'Hola! Puedo ayudarte a iniciar un tramite o consultar el estado de tu solicitud. En que te ayudo?';
  static const String _kKey = 'chat_messages';

  @override
  ChatState build() {
    final sub = FcmService.onForegroundMessage.listen((RemoteMessage msg) {
      final tramiteId = msg.data['tramiteId'] as String?;
      final body = msg.notification?.body ??
          msg.data['body'] as String? ??
          'Tu tramite fue actualizado.';
      addBotMessage(body, tramiteId: tramiteId);
    });
    ref.onDispose(sub.cancel);

    return _loadPersistedMessages();
  }

  void addBotMessage(String content, {String? tramiteId}) {
    final msg = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: 'assistant',
      content: content,
      timestamp: DateTime.now(),
      tramiteId: tramiteId,
    );
    state = state.copyWith(messages: [...state.messages, msg]);
    _persistMessages(state.messages);
  }

  void _persistMessages(List<ChatMessage> messages) {
    SharedPreferences.getInstance().then((prefs) {
      final json = jsonEncode(messages.map((m) => m.toJson()).toList());
      prefs.setString(_kKey, json);
    });
  }

  ChatState _loadPersistedMessages() {
    SharedPreferences.getInstance().then((prefs) {
      final raw = prefs.getString(_kKey);
      if (raw == null || raw.isEmpty) return;
      try {
        final list = (jsonDecode(raw) as List)
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList();
        if (list.isNotEmpty) {
          state = state.copyWith(messages: list);
        }
      } catch (_) {}
    });
    return ChatState(messages: [
      ChatMessage(
        id: '0',
        role: 'assistant',
        content: _welcome,
        timestamp: DateTime.now(),
      )
    ]);
  }

  void clearHistory() {
    SharedPreferences.getInstance().then((p) => p.remove(_kKey));
    state = build();
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    final userMsg = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: 'user',
      content: text.trim(),
      timestamp: DateTime.now(),
    );

    state = state.copyWith(
      messages: [...state.messages, userMsg],
      isLoading: true,
      error: null,
    );

    try {
      final reply = await ref
          .read(chatServiceProvider)
          .sendMessage(state.messages);

      state = state.copyWith(
        messages: [...state.messages, reply],
        isLoading: false,
      );
      _persistMessages(state.messages);
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.message,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        error: 'Error inesperado. Intentalo de nuevo.',
      );
    }
  }

  Future<void> submitForm(
      String tramiteId, Map<String, dynamic> campos) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final reply = await ref.read(chatServiceProvider).submitForm(
            tramiteId: tramiteId,
            campos: campos,
            accion: 'APROBAR',
          );
      final updatedMessages = state.messages
          .map((m) => m.action == 'FILL_FORM' ? m.copyWith(action: 'FORM_SENT') : m)
          .toList();
      state = state.copyWith(
        messages: [...updatedMessages, reply],
        isLoading: false,
        formSubmitted: true,
      );
      _persistMessages(state.messages);
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
    } catch (_) {
      state = state.copyWith(isLoading: false, error: 'Error inesperado.');
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final chatProvider = NotifierProvider<ChatNotifier, ChatState>(
  ChatNotifier.new,
);
