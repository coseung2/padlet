import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  retryUrl: string;
}

export default function ParentAutoExpired({ retryUrl }: Props) {
  return (
    <EmailShell title="연결 신청이 7일 동안 승인되지 않아 자동 만료되었습니다">
      <Text style={bodyText}>
        신청 후 7일 이내에 담임 선생님의 승인이 이루어지지 않아 신청이 자동으로 종료되었습니다.
        필요하시면 아래 버튼을 통해 다시 신청하실 수 있습니다.
      </Text>
      <Link href={retryUrl} style={ctaLink}>
        다시 신청하기
      </Link>
    </EmailShell>
  );
}
