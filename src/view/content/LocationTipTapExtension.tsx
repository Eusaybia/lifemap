import './LocationList.scss'
import { MentionOptions } from "@tiptap/extension-mention";
import { JSONContent, ReactRenderer } from "@tiptap/react";
import { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import React from "react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { motion } from "framer-motion";


export type LocationSuggestion = {
    id: string;
    locationLabel: string;
};

interface LocationProps extends SuggestionProps {
    items: LocationSuggestion[];
}

const parseLocationsAndKeyValueTags = (jsonContentOfEntireEditor: JSONContent) => {
    const locations = (jsonContentOfEntireEditor.content || []).flatMap(parseLocationsAndKeyValueTags)
    if (jsonContentOfEntireEditor.attrs && jsonContentOfEntireEditor.type === 'location') {
        const locationSuggestion: LocationSuggestion = {
            id: jsonContentOfEntireEditor.attrs.id,
            locationLabel: jsonContentOfEntireEditor.attrs.label
        }
        locations.push(locationSuggestion)
        console.log("data", jsonContentOfEntireEditor)
    }
    const uniqueLocations: (LocationSuggestion)[] = locations.filter((location, index, self) =>
        index === self.findIndex((l) => (
            l.id === location.id && l.locationLabel === location.locationLabel
        ))
    );

    console.log("unique locations list", uniqueLocations)

    return uniqueLocations
}

export const locationSuggestionOptions: MentionOptions["suggestion"] = {
    char: "@",
    allowSpaces: true,
    items: ({ query, editor }): (LocationSuggestion)[] => {
        let locations = parseLocationsAndKeyValueTags(editor.getJSON());

        const queryLocationSelection: LocationSuggestion = {
            id: "000000",
            locationLabel: query
        };

        let locationSuggestions: LocationSuggestion[] = locations.concat(query.length > 0 ? [queryLocationSelection] : [])
            // Filter for suggestions that start with the query
            .filter((locationSuggestion) => {
                if (typeof locationSuggestion === "string") {
                    // This is referring to key value pairs, which have the node name "keyValuePair"
                    return (locationSuggestion as string).toLowerCase().startsWith(query.toLowerCase())
                } else {
                    // This is referring to tags, which have the node name "location"
                    return (locationSuggestion as LocationSuggestion).locationLabel.toLowerCase().startsWith(query.toLowerCase())
                }
            })
            .slice(0, 5)

            console.log("locations", locationSuggestions)
        return locationSuggestions
    },
    render: () => {
        let component: ReactRenderer<LocationRef> | undefined;
        let popup: TippyInstance | undefined;

        return {
            onStart: (props) => {
                component = new ReactRenderer(LocationList, {
                    props,
                    editor: props.editor,
                });

                // @ts-ignore - this works perfectly fine in JS
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
                    // @ts-ignore - this works perfectly fine in JS
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

type LocationRef = {
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};


// Based off the following:
// https://github.com/ueberdosis/tiptap/blob/fc67cb1b7166c1ab6b6e0174539c9e29c364eace/demos/src/Nodes/Mention/React/MentionList.jsx#L66
const LocationList = forwardRef<LocationRef, LocationProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        if (index >= props.items.length) {
            // Make sure we actually have enough items to select the given index. For
            // instance, if a user presses "Enter" when there are no options, the index will
            // be 0 but there won't be any items, so just ignore the callback here
            return;
        }

        const suggestion = props.items[index];

        // Set all of the attributes of our Location based on the suggestion data. The fields
        // of `suggestion` will depend on whatever data you return from your `items`
        // function in your "suggestion" options handler. We are returning the
        // `LocationSuggestion` type we defined above, which we've indicated via the `items`
        // in `LocationProps`.
        const locationItem = {
            id: suggestion.id,
            label: suggestion.locationLabel,
        };
        props.command(locationItem);
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
            {props.items.length > 0 ? props.items.map((item: LocationSuggestion, index) => (
                <motion.div
                    className={`item ${index === selectedIndex ? "is-selected" : ""}`}
                    key={index}
                    onClick={() => selectItem(index)}
                >
                    📍 {item.locationLabel}
                </motion.div>
            )) :
                <div className="item">No result</div>
            }
        </div>
    );
})

LocationList.displayName = "LocationList"