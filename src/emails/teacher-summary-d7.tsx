import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  classroomName: string;
  expiredCount: number;
  inboxUrl: string;
}

export default function TeacherSummaryD7({ classroomName, expiredCount, inboxUrl }: Props) {
  return (
    <EmailShell title={`${expiredCount}명의 학부모 신청이 자동 만료되었습니다`}>
      <Text style={bodyText}>
        {classroomName} 학급에서 7일 이상 승인되지 않은 학부모 신청이 자동으로 거부 처리되었습니다.
        학부모는 이메일 안내에 따라 다시 신청할 수 있습니다.
      </Text>
      <Link href={inboxUrl} style={ctaLink}>
        승인 인박스 열기
      </Link>
    </EmailShell>
  );
}
