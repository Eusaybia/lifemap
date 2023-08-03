// import './MentionList.scss'
import { MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import React from "react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { motion } from "framer-motion";

export type MentionSuggestion = {
    id: string;
    mentionLabel: string;
};

export const mentionSuggestionOptions: MentionOptions["suggestion"] = {
    char: "#",
    allowSpaces: true,
    items: ({ query }): MentionSuggestion[] =>
        [
            "Lea Thompson",
            "Cyndi Lauper",
            "Tom Cruise",
            "Madonna",
            "Jerry Hall",
            "Joan Collins",
            "Winona Ryder",
            "Christina Applegate",
            "Alyssa Milano",
            "Molly Ringwald",
            "Ally Sheedy",
            "Debbie Harry",
            "Olivia Newton-John",
            "Elton John",
            "Michael J. Fox",
            "Axl Rose",
            "Emilio Estevez",
            "Ralph Macchio",
            "Rob Lowe",
            "Jennifer Grey",
            "Mickey Rourke",
            "John Cusack",
            "Matthew Broderick",
            "Justine Bateman",
            "Lisa Bonet",
        ]
            .concat(query.length > 0 ? [query] : [])
            .map((name, index) => ({ mentionLabel: name, id: index.toString() }))
            .filter((item) =>
                item.mentionLabel.toLowerCase().startsWith(query.toLowerCase())
            )
            .slice(0, 5),
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

interface MentionProps extends SuggestionProps {
    items: MentionSuggestion[];
}

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

    return props.items.length > 0 ? (
        <div className="items">
            {props.items.map((item, index) => (
                <motion.div
                    className={`item ${index === selectedIndex ? "is-selected" : ""}`}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    {item.mentionLabel}
                </motion.div>
            ))}
        </div>
    ) : null;
});

MentionList.displayName = "MentionList";