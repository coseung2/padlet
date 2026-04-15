import { Text } from "@react-email/components";
import EmailShell, { bodyText } from "./_shell";

export interface Props {
  classroomName: string;
}

export default function ParentClassroomDeleted({ classroomName }: Props) {
  return (
    <EmailShell title="학급이 종료되어 연결이 해제되었습니다">
      <Text style={bodyText}>
        {classroomName} 학급이 종료됨에 따라 해당 학급과의 연결이 자동으로 해제되었습니다.
        추가 문의는 학교 대표 연락처를 통해 확인해 주세요.
      </Text>
    </EmailShell>
  );
}
