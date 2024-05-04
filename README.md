[![npm](https://img.shields.io/npm/v/custom-markdown)](https://www.npmjs.com/package/custom-markdown)


Simple + customizable.

See `Demo.tsx` for a demo, or keep reading this for more details.


## Customizing

You can make it so that pretty much any pattern in the markdown gets recognized, and then rendered as your own React component. `default_schema.ts` specifies all the default patterns and components, and you can extend this or create your own schema from scratch. Here's how to extend the schema.

If you want some component `<MyComponent>` to render when `\myComponent{whatever}` shows up in the markdown, then just create an entry in the schema (name it anything you want, e.g. `my_component`), and make its 'createSubstring' parameter `\myComponent{` and its 'endSubstring' parameter `}`, and specify the getHTML function to render whatever you want.

More complicated examples: you can add a 'my_table' markdown component that recognizes syntax like `\table{{row1}{row2}{row3}}` in the markdown, and renders your own custom table component. Or adding a `## My subsection` component that takes everything in the subsection, including the children, and puts it in a div (this is already implemented for you, see the `default_schema.ts` file).


## Inner workings + extending

This library works by going from **your markdown** (raw text) -> **AST** -> **React**. "AST" means abstract syntax tree - it's an internal representation of your markdown before it gets compiled to React. It's just a bunch of nodes in the shape of the React document. We first make the AST, then we create a React component for all its nodes. Pretty simple.


## Misc notes - advanced details
There were render issues when allowing getHTML to be a component, so it's just a function right now. This means you can't use state inside of getHTML - instead, I created `globalState`, which lets you globally access state from any node in the AST. This fixes the state problem and actually worked very naturally in my own personal use case, but I'd be glad to see the project extended to include even state-based components. It shouldn't be too hard, but it won't happen unless you reach out, and I don't bite :P.


## Collaborating
I'd love to see this tool extended. Email andrewpareles@gmail.com if you want to collaborate or have any questions. 
