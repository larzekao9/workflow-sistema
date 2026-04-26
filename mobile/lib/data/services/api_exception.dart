/// Thrown by ApiClient whenever the backend returns a non-2xx status
/// or the request itself fails (timeout, no network, etc.).
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
