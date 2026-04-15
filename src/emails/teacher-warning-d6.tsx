import { Link, Text } from "@react-email/components";
import EmailShell, { bodyText, ctaLink } from "./_shell";

export interface Props {
  classroomName: string;
  pendingCount: number;
  inboxUrl: string;
}

export default function TeacherWarningD6({ classroomName, pendingCount, inboxUrl }: Props) {
  return (
    <EmailShell title={`${pendingCount}명의 학부모가 내일 자동 만료됩니다`}>
      <Text style={bodyText}>
        {classroomName} 학급에 6일 이상 승인 대기 중인 학부모가 있습니다. 7일이 경과하면 자동으로
        거부 처리되어 학부모가 다시 신청해야 합니다.
      </Text>
      <Link href={inboxUrl} style={ctaLink}>
        승인 인박스 열기
      </Link>
    </EmailShell>
  );
}
