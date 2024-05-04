import ExtractedSchemaInfo, { ASTNodeMetadata, ContextType, GlobalASTFields, GlobalState } from "./ExtractedSchemaInfo"

class AST {
    type: string
    parent: null | AST
    children: AST[] = []

    text: string // accumulated text of all child content (ignores refs + labels) 
    metadata: ASTNodeMetadata

    constructor({ typeName, parentNode }) {
        this.parent = parentNode
        this.type = typeName
        this.metadata = {}
        if (typeName === 'text')
            this.text = ''
    }
}







// HELPER
const traverseAST = <T,>(
    ASTRoot: AST,
    // top down / preorder. Can set context as traverse down by returning new context fields.
    doThisBeforeTraversingChildren: null | ((ASTNode: AST, context: ContextType) => Partial<ContextType> | void),
    // get child context using info
    useSchemaInfoToComputeChildContext: ExtractedSchemaInfo | undefined,
    // bottom up / postorder. I automatically create an array of the results at each step, but it's not currently used.
    doThisAfterTraversingChildren: null | ((ASTNode: AST, context: ContextType, childResults: T[]) => T),
    // note there's no inorder traversal -- we only have cCHILDREN, CHILDRENc.
    // We don't have LcR since we don't have L,R, we just have just CHILDREN.
) => {
    const shouldUseContext = !!useSchemaInfoToComputeChildContext

    const traverse = (ASTNode: AST, context: ContextType): T => {
        let newContext = doThisBeforeTraversingChildren?.(ASTNode, context)
        let childContext = shouldUseContext ?
            { ...context, ...newContext, ...useSchemaInfoToComputeChildContext?.infoOfType[ASTNode.type].childContext }
            : context // can use anything if not using context. Just use context...
        const childResults: T[] = ASTNode.children.map(childNode => traverse(childNode, childContext))

        if (!doThisAfterTraversingChildren)
            return null as T // we can treat null as T so this function always returns T, because we don't care about traverse's return type when !doThisAfterTraversingChildren

        return doThisAfterTraversingChildren(ASTNode, context, childResults)
    }


    // could have passed {} in here, since root's useSchemaInfoToComputeChildContext would be used immediately (on everything except root). 
    // But this is consistent with the HTML generation, which doesn't automatically use Root's context, and so passes it from the start.
    return traverse(ASTRoot, useSchemaInfoToComputeChildContext?.infoOfType['root'].childContext as ContextType)
}




















const generateAST_modifyingGlobalASTFields = (schemaInfo: ExtractedSchemaInfo, markupText: string, MUTABLE_globalASTFields: GlobalASTFields, globalState: GlobalState) => {
    const {
        createTrie,
        exitTrie,
        infoOfType,
    } = schemaInfo


    // console.log('generating AST')
    // TODO! remove this hack 
    markupText = '\n' + markupText



    // curr_node right here is temp., we enter the real root right after enter_node is defined
    let curr_node: AST = new AST({ typeName: 'temp', parentNode: 'temp' })
    // path is [rootType, ... , curr_node.type]
    let curr_path: string[] = []

    // iterate over curr_creator_checks in the way one should
    function* create_checks() {
        // TODO! doNotExitUpToMatchHere needs to get used here - it should involve exitedUp=numparentsUp!=0 and doNotExitUpToMatchHere of curr_type
        let visited = new Set()

        let stopOnNextParent = false
        for (let num_parents_up = 0; num_parents_up !== curr_path.length; num_parents_up += 1) {
            // console.log('num_parents_up = ', num_parents_up)
            let path_index = curr_path.length - 1 - num_parents_up
            let curr_check_type = curr_path[path_index]

            // this is the logic to stop when mustExitWithExitSubstring is true 
            // (so we can't exit by trying to create something too high)
            if (stopOnNextParent)
                return
            const { mustExitWithExitSubstring } = infoOfType[curr_check_type]
            if (mustExitWithExitSubstring)
                stopOnNextParent = true

            // just keep yielding the types in nestedChildrenTypesThatCanBeCreatedHereAtDepth
            // iterate over in order, eg [[1,2,3],[4,5],[6,7,8], ...]
            for (let type in infoOfType[curr_check_type].directParentTypeOfAllowedNestedChildTypeCreatableHere) {
                // if already checked, don't check again
                if (visited.has(type))
                    continue
                visited.add(type)

                yield type
            }
        }
    }

    function* exit_checks() {
        for (let num_parents_up = 0; num_parents_up !== curr_path.length; num_parents_up += 1) {
            let curr_check_type = curr_path[curr_path.length - 1 - num_parents_up]
            // if curr_type has mustExitWithExitSubstring, then yield and finish (return), else just yield 
            const { mustExitWithExitSubstring } = infoOfType[curr_check_type]
            yield curr_check_type
            if (mustExitWithExitSubstring)
                return

        }
    }


    // TODO! inefficient? might compute more text than needed
    let perform_computations_on_exit = () => {

        // TODO!!!!!!!! compare this node with previous hash to see if should keep old metadata (hash is on children values, not self values)
        // metadata
        // curr_node.metadata = {
        //     // ...schemaInfo.infoOfType[curr_node.type].ASTNodeMetadata,
        //     ...curr_node?.metadata
        // }

        // TEXT (built in)
        curr_node.text ??= ''
        for (let child of curr_node.children) {
            if (child.text && !schemaInfo.infoOfType[child.type].parentsIgnoreText)
                curr_node.text += child.text
        }

        schemaInfo.infoOfType[curr_node.type]._1_onFinalizeASTNode?.({ globalASTFields: MUTABLE_globalASTFields, ASTNode: curr_node, schemaInfo, globalState })

    }

    // curr_node enter/exit
    let enter_node = (type) => {
        // console.log('ENTERING', type)
        let child = new AST({ typeName: type, parentNode: curr_node })
        curr_node.children.push(child)
        curr_node = child
        curr_path.push(curr_node.type)
    }

    let exit_node = (canExitParent) => {
        // console.log('EXITING', curr_node.type)
        // once we exit a node, we're DONE with it in the AST. That means all its children are set -- we can compute any functions that depend on children here
        perform_computations_on_exit()
        let parent = curr_node.parent
        if (!canExitParent && !parent)
            throw `Error: exited out of the root on text \n'${markupText}'\n. Make sure you at least provide a cast to defaultType on the root so one can never exit out of the root.`
        if (parent) {
            curr_node = parent
            curr_path.pop()
        }
    }

    // start here and do what need to do to create type (try to create here, then create in parent, then ...)
    let create_type_starting_here = (type) => {
        // exit up to where child creator goes
        while (!(type in infoOfType[curr_node.type].directParentTypeOfAllowedNestedChildTypeCreatableHere))
            exit_node(false)

        // start at type and gather the parents (bottom -> top)
        let reverseCreateAndEnterPath = [type]
        let parent
        while (parent = infoOfType[curr_node.type].directParentTypeOfAllowedNestedChildTypeCreatableHere[reverseCreateAndEnterPath[reverseCreateAndEnterPath.length - 1]])
            reverseCreateAndEnterPath.push(parent)

        // now create and enter the nodes in reverseCreateAndEnterPath (top -> bottom)
        let path_entry
        while (path_entry = reverseCreateAndEnterPath.pop())
            enter_node(path_entry)

    }

    // start here and do what need to do to exit type
    let exit_type_starting_here = (type, canExitParent = false) => {
        while (curr_node.type !== type)
            exit_node(canExitParent)
        exit_node(canExitParent)
    }

    // initialize by entering root and removing all contact from parentNode
    enter_node('root')
    curr_node.parent = null
    const ASTRoot = curr_node

    // TODO! This feels optimal. How would one arrive at this optimized code in general, though? 1. write down steps: (foreach char, if matches start and is allowed, start a node, else if matches exit of an ancestor, exit up to it, else move to next char), 2. optimize
    // TODO! update: this is actually the part that's very not optimal lol. Need to fix it. Can still keep above functions. Might want to add if two matches, pick the longer one. Also want to add pattern matching, so \n\s*\n works, not just \n\n 
    // use unicode-trie?
    let i = 0
    while (i !== markupText.length) {

        // ---------- 0. find a match ----------

        // console.log('curr_path = ', curr_path)

        // start w/ default values
        let matchInfo = {
            matchedPrefix: markupText[i], // the prefix that got matched
            matchedType: 'text', // type
            matchedTrieName: 'default', // create | exit | undefined (-> 'default')
        }
        // first, check createTrie, then check exitTrie
        for (const { trieName, trie, matchLongestPrefixOfThese } of [
            { trieName: 'create', trie: createTrie, matchLongestPrefixOfThese: create_checks() },
            { trieName: 'exit', trie: exitTrie, matchLongestPrefixOfThese: exit_checks() },
        ]) {
            // console.log('checking', trieName, 'trie', trie)
            const match = trie.getMatch({ string: markupText, offset: i, matchLongestPrefixOfThese })
            if (match) {
                const { prefix, value } = match
                matchInfo = { matchedPrefix: prefix, matchedType: value, matchedTrieName: trieName }
                break
            }
        }
        const {
            matchedPrefix,
            matchedType,
            matchedTrieName
        } = matchInfo

        // console.log('MATCHED:', matchedPrefix.replaceAll('\n', '\\n'), matchedTrieName, matchedType)
        // console.log('---------------------')

        // ---------- 1. create ----------
        if (matchedTrieName === 'create') {
            create_type_starting_here(matchedType)
        }
        // ---------- 2. exit ----------
        else if (matchedTrieName === 'exit') {
            exit_type_starting_here(matchedType)
        }
        // ---------- 3. default ---------- 
        else if (matchedTrieName === 'default') {
            if (curr_node.type !== matchedType) // note matchedType === rawTextTypeName here
                create_type_starting_here(matchedType)
            curr_node.text += matchedPrefix
        }
        // ---------- 4. this should never be reached ----------
        else throw new Error(`matchedTrieName "${matchedTrieName}" not allowed`)

        // TODO! canReuseExitSubstringAsCreateSubstring --needs more thought -- in a\n\n#b, the \n\n should get reused in \n#. Need to replace \n# currerntly with \s\n*, so all whitespace is eaten.
        let shouldReusePrefix = matchedTrieName === 'exit' && infoOfType[matchedType].canReuseExitSubstringAsCreateSubstring
        if (!shouldReusePrefix)
            i += matchedPrefix.length

    } // end while


    // exit back up to root to perform all computations
    exit_type_starting_here('root', true)



    // HTML is bottom -> top. We need anything that desires top -> bottom:
    traverseAST(ASTRoot,
        (ASTNode, context) => {
            let c1 = schemaInfo.infoOfType['*']._2_onPreorderTraverseASTNode?.({ globalASTFields: MUTABLE_globalASTFields, ASTNode, context, schemaInfo, globalState })
            let c2 = schemaInfo.infoOfType[ASTNode.type]._2_onPreorderTraverseASTNode?.({ globalASTFields: MUTABLE_globalASTFields, ASTNode, context, schemaInfo, globalState })
            return { ...c1, ...c2 }
        },
        schemaInfo,
        null
    )


    // then finalize
    for (let type in schemaInfo.infoOfType)
        schemaInfo.infoOfType[type]._3_finally_ASTRoot?.({ globalASTFields: MUTABLE_globalASTFields, ASTNode: ASTRoot, schemaInfo, globalState })

    // update state
    return ASTRoot
}


export { AST }
export { generateAST_modifyingGlobalASTFields, traverseAST }