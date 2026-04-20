"use client";

import { memo } from "react";
import { CardAttachments } from "../CardAttachments";
import { CardAuthorFooter } from "./CardAuthorFooter";

type Props = {
  card: {
    title: string;
    content: string;
    imageUrl?: string | null;
    linkUrl?: string | null;
    linkTitle?: string | null;
    linkDesc?: string | null;
    linkImage?: string | null;
    videoUrl?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    fileMimeType?: string | null;
    externalAuthorName?: string | null;
    studentAuthorName?: string | null;
    authorName?: string | null;
    authors?: Array<{ order: number; displayName: string }>;
    createdAt?: string | Date | null;
  };
  // Some layouts (BreakoutBoard, ColumnsBoard) nest cards inside section
  // headings, so semantic level differs. Default h3 matches DraggableCard /
  // StreamBoard / SectionBreakoutView.
  titleAs?: "h3" | "h4";
};

export const CardBody = memo(function CardBody({ card, titleAs = "h3" }: Props) {
  const Title = titleAs;
  return (
    <>
      <CardAttachments
        imageUrl={card.imageUrl}
        linkUrl={card.linkUrl}
        linkTitle={card.linkTitle}
        linkDesc={card.linkDesc}
        linkImage={card.linkImage}
        videoUrl={card.videoUrl}
        fileUrl={card.fileUrl}
        fileName={card.fileName}
        fileSize={card.fileSize}
        fileMimeType={card.fileMimeType}
      />
      <Title className="padlet-card-title">{card.title}</Title>
      <p className="padlet-card-content">{card.content}</p>
      <CardAuthorFooter
        authors={card.authors}
        externalAuthorName={card.externalAuthorName}
        studentAuthorName={card.studentAuthorName}
        authorName={card.authorName}
        createdAt={card.createdAt}
      />
    </>
  );
});
