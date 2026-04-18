import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  retryUrl: string;
}

export default function ParentCodeRotated({ retryUrl }: Props) {
  return (
    <EmailShell title="학급 초대 코드가 갱신되어 기존 신청이 취소되었습니다">
      <Text style={bodyText}>
        담임 선생님께서 학급의 초대 코드를 새로 발급하셨습니다. 새 코드를 받으신 뒤 아래 버튼으로
        다시 신청해 주세요.
      </Text>
      <Link href={retryUrl} style={ctaLink}>
        다시 신청하기
      </Link>
    </EmailShell>
  );
}
