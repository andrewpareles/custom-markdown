
import React, { useRef } from "react";
import { GlobalState } from "./src/ExtractedSchemaInfo";
import computeASTs from "./src/computeASTs";
import RenderAST from "./src/RenderAST";
import computeSchemaInfo from "./src/computeSchemaInfo";
import default_schema from "./src/default_schema";


const myMarkdownFile = `
## Hello!

$$E^2 = (p c)^2 + (m_0 c^2)^2 \\label{myeqn}$$

This is the \\b{only} equation in relativity you need to know. Again, the equation is \\ref{myeqn}. 

\\i{Wait}...

Actually, $x^2 + y^2 + z^2 - c^2 t^2 = \\text{const.}$. I guess you need to know this too.


## bye

I wrote some \`code\`:

\`\`\`
x = "see you later!"
y = [e for e in range(20)]
print('bye.')
\`\`\`

`

// specify your schema
const mySchemaInfo = computeSchemaInfo({
    schema: default_schema, // use the default schema (you can provide your own, too, just use default_schema as a reference point)
    theseCanBeCreatedAsDirectRootChildren: ['subsection', 'block'], // you can create a 'subsection' item (by typing ##, see the 'subsection' entry), or a 'block' item (by typing pretty much anything, see the'block' entry in the default_schema)
    childContext: { ID_prefix: '', inArgs: false, useIDs: true, canHaveImages: true, inRefPreview: false, asOutline: false, }
})



// this component renders `myMarkdownFile` into React
export default function App() {
    const scrollContainerRef = useRef<HTMLDivElement>(null) // unused here, if RenderAST is in a scrollable container set this to the parent if you want to use the 'label' and 'ref' components
    const noteContainerRef = useRef<HTMLDivElement>(null)

    const globalState: GlobalState = { scrollContainerRef, noteContainerRef }

    const [globalASTFields, ASTs] = computeASTs([[mySchemaInfo, myMarkdownFile],], globalState) // this can generate multiple ASTs at the same time, that's what the "," indicates

    const ast = ASTs[0] // we only passed one schemaInfo/markdownFile pair to computeASTs, so only one AST was generated


    return <div ref={noteContainerRef}>
        <RenderAST {...({ ASTNode: ast, context: { asOutline: false }, globalASTFields, globalState, schemaInfo: mySchemaInfo })} />
    </div>
}

