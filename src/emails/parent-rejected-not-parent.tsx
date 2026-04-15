import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  retryUrl: string;
}

export default function ParentRejectedNotParent({ retryUrl }: Props) {
  return (
    <EmailShell title="연결 신청이 확인되지 않았습니다">
      <Text style={bodyText}>
        담임 선생님께서 해당 학생의 보호자로 등록된 분과 일치하지 않음을 확인하셨습니다.
        본인의 자녀 정보로 다시 신청해 주세요.
      </Text>
      <Link href={retryUrl} style={ctaLink}>
        다시 신청하기
      </Link>
    </EmailShell>
  );
}
