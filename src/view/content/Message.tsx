import React from 'react';

interface MessageProps {
  children: any;
  backgroundColor?: string;
}

interface ParsedMessage {
  initials: string;
  text: string;
}

export const parseMessage = (message: string): ParsedMessage => {
  const [initials, text] = message.split(':');
  return { initials: initials.trim(), text: text.trim() };
};

export const Message: React.FC<MessageProps> = (props: { children: any, backgroundColor?: string }) => {

  const bubbleStyles: React.CSSProperties = {
    position: 'relative',
    padding: '10px',
    borderRadius: '10px',
    marginBottom: '10px',
    minHeight: '20px',
    maxWidth: '600px',
    minWidth: '100px',
    color: "#111111"
  };

  // TODO: Make it such that it uses a custom colour for each person. Not this self vs other format.
  console.log(props.backgroundColor)

  bubbleStyles.backgroundColor = props.backgroundColor ? props.backgroundColor : '#3D5AFE';
  bubbleStyles.color = '#fff';
  bubbleStyles.alignSelf = 'flex-end';

  return (
    <div style={bubbleStyles}>
      {"💬 "}
      {props.children}
    </div>
  );
};