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
    color: "#111111",
    boxShadow: `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 0px 10px 34px -3px rgba(0, 0, 0, 0.2)`,
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