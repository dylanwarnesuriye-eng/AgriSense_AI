/**
 * User-friendly Firebase error message formatting.
 * Never exposes raw internal error strings or stack traces to the end user.
 */
export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  let errorCode = '';

  if (typeof error === 'object' && error !== null) {
    if ('code' in error && typeof (error as any).code === 'string') {
      errorCode = (error as any).code;
    } else if ('message' in error && typeof (error as any).message === 'string') {
      const msg = (error as any).message;
      const match = msg.match(/\((auth\/[a-z0-9-]+)\)/i);
      if (match) {
        errorCode = match[1];
      }
    }
  } else if (typeof error === 'string') {
    const match = error.match(/auth\/[a-z0-9-]+/i);
    if (match) {
      errorCode = match[0];
    }
  }

  switch (errorCode.toLowerCase()) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to continue this operation.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project.';
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
      return 'Firebase service configuration issue. Please contact support.';
    default:
      return 'Authentication failed. Please check your details and try again.';
  }
}
