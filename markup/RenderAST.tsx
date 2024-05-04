
// need to ensure it always gets inputted the full context

import SchemaInfo, { GlobalASTFields, GlobalState, HTMLContextType, HTMLOnlyContextType } from "./SchemaInfo"
import { AST } from "./AST"

// can't use traverseAST here: it recurses thru each node, and this only gets called on the root node and then recurses by calling getHTML.
type helperProps = { ASTNode: AST, context: HTMLContextType, schemaInfo: SchemaInfo, globalASTFields: GlobalASTFields, globalState: GlobalState, init_context: HTMLContextType }
const ASTComponent_helper = (props: helperProps) => {
    const { ASTNode, context, schemaInfo, globalASTFields, globalState, init_context } = props

    return schemaInfo.infoOfType[ASTNode.type].getHTML?.({
        // global context
        init_context,
        globalASTFields,
        schemaInfo,
        globalState,

        // AST-related (state-related)
        ASTNode,
        context,

        // only requires partial props, unlike _helper
        ASTComponent: ({ ASTNode: renderASTNode, context: newContext }) => ASTComponent_helper({ ...props, ASTNode: renderASTNode, context: newContext ? { ...context, ...newContext } : context })
    })
}



type rootComponentProps = {
    ASTNode: AST,
    context: HTMLOnlyContextType,
    globalASTFields: GlobalASTFields,
    globalState: GlobalState,
    schemaInfo: SchemaInfo,
}
const RenderAST = (props: rootComponentProps) => {
    const rootContext = { ...(props.schemaInfo.infoOfType['root'].childContext as HTMLContextType), ...props.context }
    return ASTComponent_helper({
        ...props,
        ASTNode: props.ASTNode,
        context: rootContext,
        init_context: rootContext,
    })
}

export default RenderAST