export type GitHubErrorCode =
  | 'config_missing'
  | 'config_invalid'
  | 'auth_failed'
  | 'installation_not_found'
  | 'installation_suspended'
  | 'repository_not_found'
  | 'repository_already_linked'
  | 'library_already_linked'
  | 'signature_invalid'
  | 'payload_invalid'
  | 'delivery_duplicate'
  | 'unsupported_event';

export class GitHubIntegrationError extends Error {
  readonly code: GitHubErrorCode;

  constructor(code: GitHubErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GitHubIntegrationError';
    this.code = code;
  }
}
