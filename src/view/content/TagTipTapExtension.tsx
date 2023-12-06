import './MentionList.scss'
import { MentionOptions } from "@tiptap/extension-mention";
import { JSONContent, ReactRenderer } from "@tiptap/react";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import React from "react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { motion } from "framer-motion";


export type MentionSuggestion = {
    id: string;
    mentionLabel: string;
};

interface MentionProps extends SuggestionProps {
    items: MentionSuggestion[];
}

const parseMentionsAndKeyValueTags = (jsonContentOfEntireEditor: JSONContent) => {
    const mentions = (jsonContentOfEntireEditor.content || []).flatMap(parseMentionsAndKeyValueTags)
    if (jsonContentOfEntireEditor.attrs && jsonContentOfEntireEditor.type === 'mention') {
        const mentionSuggestion: MentionSuggestion = {
            id: jsonContentOfEntireEditor.attrs.id,
            mentionLabel: jsonContentOfEntireEditor.attrs.label
        }
        mentions.push(mentionSuggestion)
        console.log("data", jsonContentOfEntireEditor)
    }
    const uniqueMentions: (MentionSuggestion)[] = [...new Set(mentions)] as MentionSuggestion[]

    console.log("unique mentions list", uniqueMentions)

    return uniqueMentions
}

export const mentionSuggestionOptions: MentionOptions["suggestion"] = {
    char: "#",
    allowSpaces: true,
    items: ({ query, editor }): (MentionSuggestion)[] => {
        let mentions = parseMentionsAndKeyValueTags(editor.getJSON());

        const queryMentionSelection: MentionSuggestion = {
            id: "000000",
            mentionLabel: query
        };

        let mentionSuggestions: MentionSuggestion[] = mentions.concat(query.length > 0 ? [queryMentionSelection] : [])
            // Filter for suggestions that start with the query
            .filter((mentionSuggestion) => {
                if (typeof mentionSuggestion === "string") {
                    // This is referring to key value pairs, which have the node name "keyValuePair"
                    return (mentionSuggestion as string).toLowerCase().startsWith(query.toLowerCase())
                } else {
                    // This is referring to tags, which have the node name "mention"
                    return (mentionSuggestion as MentionSuggestion).mentionLabel.toLowerCase().startsWith(query.toLowerCase())
                }
            })
            .slice(0, 5)

            console.log("mentions", mentionSuggestions)
        return mentionSuggestions
    },
    render: () => {
        let component: ReactRenderer<MentionRef> | undefined;
        let popup: TippyInstance | undefined;

        return {
            onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                });

                popup = tippy("body", {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: "manual",
                    placement: "bottom-start",
                })[0];
            },

            onUpdate(props) {
                component?.updateProps(props);

                popup?.setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown(props) {
                if (props.event.key === "Escape") {
                    popup?.hide();
                    return true;
                }

                if (!component?.ref) {
                    return false;
                }

                return component?.ref.onKeyDown(props);
            },

            onExit() {
                popup?.destroy();
                component?.destroy();

                // Remove references to the old popup and component upon destruction/exit.
                // (This should prevent redundant calls to `popup.destroy()`, which Tippy
                // warns in the console is a sign of a memory leak, as the `suggestion`
                // plugin seems to call `onExit` both when a suggestion menu is closed after
                // a user chooses an option, *and* when the editor itself is destroyed.)
                popup = undefined;
                component = undefined;
            },
        };
    },
};

type MentionRef = {
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};


// Based off the following:
// https://github.com/ueberdosis/tiptap/blob/fc67cb1b7166c1ab6b6e0174539c9e29c364eace/demos/src/Nodes/Mention/React/MentionList.jsx#L66
const MentionList = forwardRef<MentionRef, MentionProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        if (index >= props.items.length) {
            // Make sure we actually have enough items to select the given index. For
            // instance, if a user presses "Enter" when there are no options, the index will
            // be 0 but there won't be any items, so just ignore the callback here
            return;
        }

        const suggestion = props.items[index];

        // Set all of the attributes of our Mention based on the suggestion data. The fields
        // of `suggestion` will depend on whatever data you return from your `items`
        // function in your "suggestion" options handler. We are returning the
        // `MentionSuggestion` type we defined above, which we've indicated via the `items`
        // in `MentionProps`.
        const mentionItem = {
            id: suggestion.id,
            label: suggestion.mentionLabel,
        };
        props.command(mentionItem);
    };

    const upHandler = () => {
        setSelectedIndex(
            (selectedIndex + props.items.length - 1) % props.items.length
        );
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === "ArrowUp") {
                upHandler();
                return true;
            }

            if (event.key === "ArrowDown") {
                downHandler();
                return true;
            }

            if (event.key === "Enter") {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    return (
        <div className="items">
            {props.items.length > 0 ? props.items.map((item: MentionSuggestion, index) => (
                <motion.div
                    className={`item ${index === selectedIndex ? "is-selected" : ""}`}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    {item.mentionLabel}
                </motion.div>
            )) :
                <div className="item">No result</div>
            }
        </div>
    );
})

MentionList.displayName = "MentionList"