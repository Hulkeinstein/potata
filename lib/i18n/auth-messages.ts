const en = {
  signInWith: "Sign in with", google: "Continue with Google", emailLogin: "Sign in with email",
  loginTitle: "Email sign in", email: "Email", password: "Password", confirmPassword: "Confirm password",
  loggingIn: "Signing in...", login: "Sign in", noAccount: "Don't have an account? ", signup: "Sign up",
  guest: "Browse without signing in", invalidCredentials: "The email or password is incorrect.",
  close: "Close", back: "Back", signupTitle: "Email sign up",
  signupHint: "After verification, complete your name, handle, preferences and consent.",
  providerHint: "Create an account, then set up your profile and consent together.",
  apple: "Continue with Apple (coming soon)", comingSoon: "Coming soon", emailSignup: "Sign up with email",
  existingAccount: "Already have an account? Sign in", processing: "Processing...", nextVerify: "Next — verify email",
  mismatch: "Passwords do not match.", shortPassword: "The password must contain at least {count} characters.",
  signupFailed: "Sign up failed. Please try again.", connection: "Cannot connect to the server. Please try again later.",
  verifyFailed: "Verification failed. Please try again.", resendFailed: "Could not resend the code. Please try again.",
  verifyTitle: "Verify email", verifyHint: "Check your verification code", sentTo: "Sent to",
  enterCode: "Enter the {count}-digit verification code", incompleteCode: "Enter all {count} digits of the verification code.",
  verified: "Email verified!", redirecting: "Redirecting to sign in...", verify: "Verify",
  noCode: "Didn't receive a code?", resend: "Resend verification code", resendCountdown: "Resend ({count}s)",
  codeDigit: "Verification code digit {count}",
  signupUnavailable: "Sign up is not available yet.", emailTaken: "This email is already registered. Please sign in.",
  invalidEmail: "Enter a valid email address.", rateLimited: "Too many requests. Please try again later.",
  requestMissing: "Verification request not found. Please sign up again.",
  expired: "The code has expired. Please resend it.", tooManyAttempts: "Too many verification attempts. Please sign up again.",
} as const;

type AuthMessages = { readonly [Key in keyof typeof en]: string };
const ko = {
  signInWith: "로그인 방식 선택", google: "Google로 계속하기", emailLogin: "이메일로 로그인",
  loginTitle: "이메일 로그인", email: "이메일", password: "비밀번호", confirmPassword: "비밀번호 확인",
  loggingIn: "로그인 중...", login: "로그인", noAccount: "계정이 없으신가요? ", signup: "회원가입",
  guest: "로그인 없이 둘러보기", invalidCredentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  close: "닫기", back: "뒤로", signupTitle: "이메일 회원가입",
  signupHint: "인증 후 이름, 핸들, 선택 설정과 약관 동의를 완료합니다.",
  providerHint: "계정을 만든 뒤 프로필과 약관을 한 번에 설정합니다.",
  apple: "Apple로 계속하기 (준비중)", comingSoon: "준비중입니다", emailSignup: "이메일로 회원가입",
  existingAccount: "이미 계정이 있으신가요? 로그인", processing: "처리 중...", nextVerify: "다음 — 이메일 인증",
  mismatch: "비밀번호가 일치하지 않습니다.", shortPassword: "비밀번호는 {count}자 이상이어야 합니다.",
  signupFailed: "회원가입에 실패했습니다. 다시 시도해주세요.", connection: "서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
  verifyFailed: "인증에 실패했습니다. 다시 시도해주세요.", resendFailed: "재발송에 실패했습니다. 다시 시도해주세요.",
  verifyTitle: "이메일 인증", verifyHint: "인증 코드를 확인해주세요", sentTo: "발송 주소",
  enterCode: "{count}자리 인증 코드를 입력해주세요", incompleteCode: "{count}자리 인증 코드를 모두 입력해주세요.",
  verified: "인증 완료!", redirecting: "잠시 후 로그인 화면으로 이동합니다...", verify: "인증하기",
  noCode: "코드를 받지 못하셨나요?", resend: "인증 코드 재발송", resendCountdown: "재발송 ({count}초)",
  codeDigit: "인증 코드 {count}번째 숫자",
  signupUnavailable: "회원가입 준비가 완료되지 않았습니다.", emailTaken: "이미 가입된 이메일입니다. 로그인해주세요.",
  invalidEmail: "올바른 이메일 형식을 입력해주세요.", rateLimited: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.",
  requestMissing: "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해주세요.",
  expired: "인증 코드가 만료되었습니다. 재발송을 눌러주세요.", tooManyAttempts: "인증 시도 횟수를 초과했습니다. 다시 회원가입을 시도해주세요.",
} as const satisfies AuthMessages;

export const authMessages = { en, ko } as const;
export type AuthMessageKey = keyof AuthMessages;

export function authErrorKey(message: string, fallback: AuthMessageKey): AuthMessageKey {
  switch (message) {
    case ko.signupUnavailable: return "signupUnavailable";
    case ko.emailTaken:
    case "이미 사용 중인 이메일입니다.": return "emailTaken";
    case ko.invalidEmail: return "invalidEmail";
    case ko.rateLimited: return "rateLimited";
    case ko.requestMissing: return "requestMissing";
    case ko.expired: return "expired";
    case ko.tooManyAttempts: return "tooManyAttempts";
    default: return fallback;
  }
}
