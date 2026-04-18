import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  classroomName: string;
  pendingCount: number;
  inboxUrl: string;
}

export default function TeacherReminderD3({ classroomName, pendingCount, inboxUrl }: Props) {
  return (
    <EmailShell title={`${pendingCount}명의 학부모가 승인 대기 중입니다`}>
      <Text style={bodyText}>
        {classroomName} 학급에 3일 이상 승인 대기 중인 학부모가 있습니다. 승인 인박스를 확인해 주세요.
      </Text>
      <Link href={inboxUrl} style={ctaLink}>
        승인 인박스 열기
      </Link>
    </EmailShell>
  );
}
