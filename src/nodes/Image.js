import { Node, Plugin } from "tiptap";
import { nodeInputRule } from "tiptap-commands";
import ImageView from "../components/ImageView.vue";
import { DEFAULT_IMAGE_WIDTH } from "../utils/constants";

/**
 * Matches following attributes in Markdown-typed image: [, alt, src, title]
 *
 * Example:
 * ![Lorem](image.jpg) -> [, "Lorem", "image.jpg"]
 * ![](image.jpg "Ipsum") -> [, "", "image.jpg", "Ipsum"]
 * ![Lorem](image.jpg "Ipsum") -> [, "Lorem", "image.jpg", "Ipsum"]
 */
const IMAGE_INPUT_REGEX = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

export default class Image extends Node {
  get defaultOptions() {
    return {
      defaultWidth: DEFAULT_IMAGE_WIDTH,
    };
  }

  get name() {
    return "image";
  }

  get schema() {
    return {
      inline: true,
      attrs: {
        src: {
          default: "",
        },
        alt: {
          default: "",
        },
        title: {
          default: "",
        },
        width: {
          default: null,
        },
        height: {
          default: null,
        },
      },
      group: "inline",
      draggable: true,
      parseDOM: [
        {
          tag: "img[src]",
          getAttrs: (dom) => {
            let { width, height } = dom.style;
            width = width || dom.getAttribute("width") || null;
            height = height || dom.getAttribute("height") || null;

            return {
              src: dom.getAttribute("src") || "",
              title: dom.getAttribute("title") || "",
              alt: dom.getAttribute("alt") || "",
              width: width == null ? null : parseInt(width, 10),
              height: height == null ? null : parseInt(height, 10),
            };
          },
        },
      ],
      toDOM: (node) => ["img", node.attrs],
    };
  }

  commands({ type }) {
    return (attrs) => (state, dispatch) => {
      const { selection } = state;
      const position = selection.$cursor
        ? selection.$cursor.pos
        : selection.$to.pos;
      const node = type.create(attrs);
      const transaction = state.tr.insert(position, node);
      dispatch(transaction);
    };
  }

  inputRules({ type }) {
    return [
      nodeInputRule(IMAGE_INPUT_REGEX, type, (match) => {
        const [, alt, src, title] = match;
        return {
          src,
          alt,
          title,
        };
      }),
    ];
  }

  get view() {
    return ImageView;
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop(view, event) {
              const hasFiles =
                event.dataTransfer &&
                event.dataTransfer.files &&
                event.dataTransfer.files.length;

              if (!hasFiles) {
                return;
              }

              const images = Array.from(
                event.dataTransfer.files
              ).filter((file) => /image/i.test(file.type));

              if (images.length === 0) {
                return;
              }

              event.preventDefault();

              const { schema } = view.state;
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });

              images.forEach((image) => {
                const reader = new FileReader();

                reader.onload = (readerEvent) => {
                  const node = schema.nodes.image.create({
                    src: readerEvent.target.result,
                  });
                  const transaction = view.state.tr.insert(
                    coordinates.pos,
                    node
                  );
                  view.dispatch(transaction);
                };
                reader.readAsDataURL(image);
              });
            },
          },
        },
      }),
    ];
  }
}
