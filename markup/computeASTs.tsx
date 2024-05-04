
import { AST, generateAST_modifyingGlobalASTFields } from './AST'
import SchemaInfo, { GlobalASTFields, GlobalState } from './SchemaInfo'

//[[titleInfo,title_text], [descInfo, desc_text], ...], { imageOfLabel, cropAndImageOfLabel, etc }
const computeASTs = (astParameters: [SchemaInfo, string][], globalState: GlobalState): [GlobalASTFields, AST[]] => {
    // every time an update happens, recompute everything (labels, refs, etc assume starting from scratch. 
    // Can optimize for this later by diffing ASTNode trees)

    const globalASTFields_: any = {}
    // create globalASTFields based on schemaInfo's _0_initGlobalASTFields
    for (let [info, _] of astParameters) {
        for (let type in info.infoOfType) {
            const new_globalASTFields = info.infoOfType[type]._0_initGlobalASTFields?.()
            for (let key in new_globalASTFields)
                globalASTFields_[key] = new_globalASTFields[key]
        }
    }
    const globalASTFields: GlobalASTFields = globalASTFields_

    // create ASTs
    const ASTRoots: AST[] = []
    for (let [info, text] of astParameters) {
        const ASTRoot = generateAST_modifyingGlobalASTFields(info, text, globalASTFields, globalState)
        ASTRoots.push(ASTRoot)
    }

    return [globalASTFields, ASTRoots]
}



export default computeASTs