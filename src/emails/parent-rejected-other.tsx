import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  retryUrl: string;
}

export default function ParentRejectedOther({ retryUrl }: Props) {
  return (
    <EmailShell title="연결 신청이 처리되지 않았습니다">
      <Text style={bodyText}>
        담임 선생님의 확인 결과 해당 신청이 처리되지 않았습니다. 자세한 사유는 학교 대표 연락처를 통해
        문의해 주세요. 필요하시면 아래 버튼을 통해 다시 신청하실 수 있습니다.
      </Text>
      <Link href={retryUrl} style={ctaLink}>
        다시 신청하기
      </Link>
    </EmailShell>
  );
}
