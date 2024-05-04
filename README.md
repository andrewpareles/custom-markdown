[![npm](https://img.shields.io/npm/v/custom-markdown)](https://www.npmjs.com/package/custom-markdown)


Simple + customizable.

See [Demo.tsx](https://github.com/andrewpareles/custom-markdown/blob/main/Demo.tsx) for a demo, or keep reading for more details.


## Customizing

You can make it so that pretty much any pattern in the markdown gets recognized and then rendered into a custom React component. Just extend [default_schema.ts](https://github.com/andrewpareles/custom-markdown/blob/main/default_schema.ts). 

If you want to render `\myComponent{whatever}` in your markdown to `<MyComponent>`, all you need to do is create an entry in the schema with  `createSubstring = '\myComponent{'` and `endSubstring = '}'`.

More examples of what you can do: 

- You can add a 'my_table' markdown component that recognizes syntax like `\table{{row1}{row2}{row3}}` in the markdown and render your own custom table component. You just need to make a table schema entry that recognizes `\\table{whatever}`, and a row schema entry that recognizes `'{whatever}'`, and make it so the row is only allowed to be created in table. 
- Or, you can do complicated things like add a `## My subsection` component that takes everything in the subsection, including the children, and puts it in a div - this is already implemented as the `'subsection'` entry in [default_schema.ts](https://github.com/andrewpareles/custom-markdown/blob/main/default_schema.ts). 
- You can even add things like bullet points like `- a`, just make it so that `createString = '\n- a'` and `endString = '\n'`.

## Inner workings

This library works by converting from **your markdown -> AST -> React**. The AST is an internal representation of your markdown - without risk of oversimplifying, it's just a bunch of nodes in the shape of the React document. We first make the AST, then we create a React component for all its nodes. 


## Misc notes - advanced details
There were render issues when allowing getHTML to be a component, so it's just a function right now. This means you can't use state inside of getHTML - instead, I created `globalState`, which lets you globally access state from any node in the AST. This fixes the state problem and actually worked very naturally in my own personal use case, but I'd be glad to see the project extended to include even state-based components. It shouldn't be too hard, but it won't happen unless you reach out, and I don't bite :P.


## Collaborating
I'd love to see this tool extended. Email andrewpareles@gmail.com if you want to collaborate or have any questions. 
