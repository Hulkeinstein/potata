export const onboardingMessages = {
  en: {
    heading: "Complete your profile", introduction: "Review required information and optional preferences in one place.", loading: "Loading your profile...",
    required: "Required profile", name: "Display name", handle: "Handle", handleHint: "3–20 lowercase letters, numbers or underscores",
    optional: "Optional preferences", size: "Preferred size", later: "Set later", height: "Height (cm)", weight: "Weight (kg)", fitNote: "Used only for AI style and fit recommendations. You can sign up without these details.", ai: "Show AI Coordinator recommendations",
    consent: "Agreements", terms: "Terms of Service (required)", privacy: "Privacy Notice (required)", marketing: "Marketing emails (optional)", consentNote: "You can join without optional consent and withdraw it in Settings.", full: "Read full text", fullSuffix: " — read full text", saving: "Saving...", complete: "Complete profile",
    photo: "Profile photo · optional", preview: "Profile photo preview", noPhoto: "No profile photo", uploading: "Uploading...", choosePhoto: "Choose photo", choosePhotoAria: "Choose profile photo", deletePhoto: "Delete photo", photoHint: "Saved immediately on selection · JPG, PNG, WEBP · max 5MB",
    loadError: "Could not load your profile.", loadResponse: "Could not load your profile. Please check the server response.", network: "Cannot connect to the server.", saveError: "Could not save your profile.", saveResponse: "Could not confirm the save result. Please try again.", uploadError: "Could not upload your photo.", deleteError: "Could not delete your photo.", responseError: "Could not read the server response. Please try again.", accountMissing: "Account not found.", loginRequired: "Please sign in.", handleLength: "Handle must be 3–20 characters.", handleFormat: "Only lowercase letters (a-z), numbers and underscores (_) are allowed. Uppercase letters and spaces are not allowed.", handleReserved: "This handle cannot be used.", handleAvailable: "This handle is available.", handleTaken: "This handle is already in use.", handleCheckError: "Could not check handle availability.",
    closeLegal: "Close legal document", fullPage: "View full page", confirm: "Close", originalNotice: "Original legal draft below; not an approved translation. Counsel approval is required before launch.",
    nameLength: "Display name must be 2–50 characters.", requiredConsent: "Please accept the required Terms and Privacy Notice.", latestTerms: "Please review the latest agreements.", signupClosed: "Public sign-up is not ready yet.", handleLocked: "An existing handle cannot be changed.", photoLimit: "Profile photo must be 5MB or smaller.", photoFormat: "Use a JPG, PNG or WEBP image.", photoRate: "Too many photo upload requests. Please try again later.", photoConflict: "Your photo changed in another request. Please try again.",
  },
  ko: {
    heading: "프로필을 완성해주세요", introduction: "필수 정보와 선택 설정을 한 화면에서 확인합니다.", loading: "프로필을 불러오는 중...",
    required: "필수 프로필", name: "표시 이름", handle: "핸들", handleHint: "영소문자·숫자·밑줄만 3~20자",
    optional: "선택 설정", size: "선호 사이즈", later: "나중에 설정", height: "키 (cm)", weight: "몸무게 (kg)", fitNote: "AI 스타일·핏 추천에만 사용하며 입력하지 않아도 가입할 수 있습니다.", ai: "AI Coordinator 추천 표시",
    consent: "약관 동의", terms: "이용약관 동의 (필수)", privacy: "개인정보 처리방침 동의 (필수)", marketing: "마케팅 이메일 수신 (선택)", consentNote: "선택 동의를 거부해도 가입할 수 있으며 Settings에서 철회할 수 있습니다.", full: "전문", fullSuffix: " 전문 보기", saving: "저장 중...", complete: "프로필 완성하기",
    photo: "프로필 사진 · 선택", preview: "프로필 사진 미리보기", noPhoto: "프로필 사진 없음", uploading: "업로드 중...", choosePhoto: "사진 선택", choosePhotoAria: "프로필 사진 선택", deletePhoto: "사진 삭제", photoHint: "선택하면 바로 저장됩니다 · JPG, PNG, WEBP · 최대 5MB",
    loadError: "프로필을 불러오지 못했습니다.", loadResponse: "프로필을 불러오지 못했습니다. 서버 응답을 확인해 주세요.", network: "서버와 연결할 수 없습니다.", saveError: "저장하지 못했습니다.", saveResponse: "저장 결과를 확인할 수 없습니다. 다시 시도해 주세요.", uploadError: "사진을 업로드하지 못했습니다.", deleteError: "사진을 삭제하지 못했습니다.", responseError: "서버 응답을 확인할 수 없습니다. 다시 시도해 주세요.", accountMissing: "계정을 찾을 수 없습니다.", loginRequired: "로그인이 필요합니다.", handleLength: "핸들은 3~20자여야 합니다.", handleFormat: "영소문자(a-z)·숫자·밑줄(_)만 사용할 수 있습니다. 대문자와 공백은 사용할 수 없습니다.", handleReserved: "사용할 수 없는 핸들입니다.", handleAvailable: "사용 가능한 핸들입니다.", handleTaken: "이미 사용 중인 핸들입니다.", handleCheckError: "핸들 중복 확인에 실패했습니다.",
    closeLegal: "약관 닫기", fullPage: "전체 페이지로 보기", confirm: "확인", originalNotice: "아래는 법률 원문 초안이며 승인된 번역이 아닙니다. 공개 전 법률 검토가 필요합니다.",
    nameLength: "표시 이름은 2~50자로 입력해주세요.", requiredConsent: "필수 약관과 개인정보 처리방침에 동의해주세요.", latestTerms: "최신 약관을 다시 확인해주세요.", signupClosed: "공개 가입 준비 중입니다.", handleLocked: "이미 설정한 핸들은 변경할 수 없습니다.", photoLimit: "프로필 이미지는 5MB 이하만 가능합니다.", photoFormat: "지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP를 사용해 주세요.", photoRate: "사진 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", photoConflict: "프로필 사진이 다른 요청에서 변경되었습니다. 다시 시도해 주세요.",
  },
} as const;

export type OnboardingMessageKey = keyof typeof onboardingMessages.en;
export function onboardingErrorKey(message: string | undefined, fallback: OnboardingMessageKey): OnboardingMessageKey {
  switch (message) {
    case "핸들은 3~20자여야 합니다.": return "handleLength";
    case "영소문자(a-z)·숫자·밑줄(_)만 사용할 수 있습니다. 대문자와 공백은 사용할 수 없습니다.": return "handleFormat";
    case "사용할 수 없는 핸들입니다.": return "handleReserved";
    case "이미 사용 중인 핸들입니다.": case "이미 사용 중인 핸들입니다": return "handleTaken";
    case "계정을 찾을 수 없습니다.": return "accountMissing";
    case "Unauthorized": case "로그인이 필요합니다.": return "loginRequired";
    case "표시 이름은 2~50자로 입력해주세요.": return "nameLength";
    case "필수 약관과 개인정보 처리방침에 동의해주세요.": return "requiredConsent";
    case "최신 약관을 다시 확인해주세요.": return "latestTerms";
    case "공개 가입 준비 중입니다.": return "signupClosed";
    case "이미 설정한 핸들은 변경할 수 없습니다.": return "handleLocked";
    case "프로필 이미지는 5MB 이하만 가능합니다.": return "photoLimit";
    case "지원하지 않는 이미지 형식입니다. JPG, PNG, WEBP를 사용해 주세요.": return "photoFormat";
    case "사진 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.": return "photoRate";
    case "프로필 사진이 다른 요청에서 변경되었습니다. 다시 시도해 주세요.": return "photoConflict";
    default: return fallback;
  }
}
