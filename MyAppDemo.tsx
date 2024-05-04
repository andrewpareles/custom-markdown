
import React, { useRef } from "react";
import defaultSchemaInfo from "./markup/defaultSchemaInfo";
import { GlobalState } from "./markup/ExtractedSchemaInfo";
import computeASTs from "./markup/computeASTs";
import RenderAST from "./markup/RenderAST";


const myMarkdownFile = `
## Hello!

$$E^2 = (p c)^2 + (m_0 c^2)^2 $$

This is the \\b{only} equation in relativity you need to know (\\i{wait}...).

Actually, $x^2 + y^2 + z^2 - c^2 t^2 = \\text{const.}$. I guess you need to know this too.


## bye

I wrote some \`code\`:

\`\`\`
x = "see you later!"
y = [e for e in range(20)]
print('bye.')
\`\`\`


`


export default function App() {


    const scrollContainerRef = useRef<HTMLDivElement>(null) // unused, this is only used when the scroll container is separate from the note container
    const noteContainerRef = useRef<HTMLDivElement>(null)

    const globalState: GlobalState = { scrollContainerRef, noteContainerRef }

    const [globalASTFields, ASTs] = computeASTs([[defaultSchemaInfo, myMarkdownFile],], globalState) // this can generate multiple ASTs at the same time, that's what the "," indicates

    const ast = ASTs[0] // we only passed one schemaInfo/markdownFile pair to computeASTs, so only one AST was generated


    return <>
        <RenderAST {...({ ASTNode: ast, context: { asOutline: false }, globalASTFields, globalState, schemaInfo: defaultSchemaInfo })} />
    </>
}