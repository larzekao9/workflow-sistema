class UserSession {
  final String token;
  final String id;
  final String nombreCompleto;
  final String rolNombre;

  const UserSession({
    required this.token,
    required this.id,
    required this.nombreCompleto,
    required this.rolNombre,
  });

  factory UserSession.fromJson(Map<String, dynamic> json) {
    // Backend response has nested 'user'; stored flat JSON does not.
    final String token = json['token'] as String;
    final Map<String, dynamic> u =
        json.containsKey('user') ? json['user'] as Map<String, dynamic> : json;
    return UserSession(
      token: token,
      id: (u['id'] as String?) ?? '',
      nombreCompleto: u['nombreCompleto'] as String,
      rolNombre: u['rolNombre'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'id': id,
      'nombreCompleto': nombreCompleto,
      'rolNombre': rolNombre,
    };
  }

  @override
  String toString() =>
      'UserSession(nombreCompleto: $nombreCompleto, rolNombre: $rolNombre)';
}
