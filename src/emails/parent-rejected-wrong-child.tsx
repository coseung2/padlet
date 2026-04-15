import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  retryUrl: string;
}

export default function ParentRejectedWrongChild({ retryUrl }: Props) {
  return (
    <EmailShell title="연결 신청이 확인되지 않았습니다">
      <Text style={bodyText}>
        선택하신 학생 정보가 담임 선생님께서 보신 정보와 일치하지 않아 연결이 처리되지 않았습니다.
        자녀의 반/번호를 다시 확인하신 후 재신청해 주세요.
      </Text>
      <Link href={retryUrl} style={ctaLink}>
        다시 신청하기
      </Link>
    </EmailShell>
  );
}
