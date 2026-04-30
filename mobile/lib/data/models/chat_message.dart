class ChatMessage {
  final String id;
  final String role; // 'user' | 'assistant'
  final String content;
  final DateTime timestamp;
  final String? action;
  final String? tramiteId;
  final List<Map<String, dynamic>>? fields;

  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.action,
    this.tramiteId,
    this.fields,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) {
    final rawFields = j['fields'] as List<dynamic>?;
    return ChatMessage(
      id: j['id'] as String,
      role: j['role'] as String,
      content: j['content'] as String,
      timestamp: DateTime.parse(j['timestamp'] as String),
      action: j['action'] as String?,
      tramiteId: j['tramiteId'] as String?,
      fields: rawFields
          ?.map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'role': role,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        if (action != null) 'action': action,
        if (tramiteId != null) 'tramiteId': tramiteId,
        if (fields != null) 'fields': fields,
      };

  ChatMessage copyWith({
    String? id,
    String? role,
    String? content,
    DateTime? timestamp,
    Object? action = _sentinel,
    Object? tramiteId = _sentinel,
    Object? fields = _sentinel,
  }) =>
      ChatMessage(
        id: id ?? this.id,
        role: role ?? this.role,
        content: content ?? this.content,
        timestamp: timestamp ?? this.timestamp,
        action: action == _sentinel ? this.action : action as String?,
        tramiteId:
            tramiteId == _sentinel ? this.tramiteId : tramiteId as String?,
        fields: fields == _sentinel
            ? this.fields
            : fields as List<Map<String, dynamic>>?,
      );
}

// Sentinel object so copyWith can explicitly pass null for nullable fields.
const Object _sentinel = Object();
