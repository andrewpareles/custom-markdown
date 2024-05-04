import { ForwardedRef, MutableRefObject, RefObject } from 'react'
import Trie from './Trie'
import { AST } from './AST'
// All the information you ever need to use in AST


type TypeMetadata = {
    canBeLabeled?: {
        stampCountKey: string, // stamps with different `stampCountKey`s are counted independently (ex. section and subsection)
        // in stampHTML, "ASTNode" = labeledASTNode

        // stampHTML is used in the 'ref' type, and sometimes also in getHTML of the labeled thing
        stampHTML: (count: number | undefined, inputs: { ASTNode: AST, ASTComponent: ASTComponent }) => React.ReactNode
        // countWhen: TODO! 'labelAndRefPresent' | 'always'
    },
    desiredIDFn?: ({ ASTNode, context }: { ASTNode: AST, context: { [paramName: string]: any } }) => string | null,
}


// built when AST is built
type GlobalASTFields = {
    desIDcount: { [desID: string]: number },

    // 3 parts of label/ref: \label, labeled item, \ref to the labeled item
    labelOfLabelText: { [labelText: string]: AST },
    labeledOfLabelText: { [labelText: string]: AST },
    labelTextsWithARef: Set<string>,

    assignedSectionIds: string[],
}

type ASTNodeMetadata = {
    assignedID?: string,
    error?: string,
    labeledByLabelText?: string, // applies to labeled node, not so necessary but helpful for error messages
    stampCount?: number, // applies to labeled node
    paragraphs?: { isParagraph: boolean, nodes: AST[] }[] // applies to 'inline'
    // isMinimized?: boolean, // applies to section, subsection. Comes from GlobalState. undefined means not applicable.
    split_delimeters?: number[], // applies to split
}

type ContextType = {
    ID_prefix: string,
    useIDs: boolean,
    inArgs: boolean,
    canHaveImages: boolean,
    inRefPreview: boolean, // currently being re-rendered inside of an overlay in ref
}
type ASTBuilderContextType = ContextType & { [fieldName: string]: any }
type HTMLOnlyContextType = { asOutline: boolean, }
type HTMLContextType = ContextType & HTMLOnlyContextType & { [fieldName: string]: any }


// IMPORTANT: GlobalState is the React state. everything in GlobalState applies to the AST, since
// everything is computed based on the current state. If you update GlobalState, it updates the AST.
type GlobalState = {
    noteContainerRef: MutableRefObject<HTMLDivElement | null>, // used to get width and left of container for previews
    scrollContainerRef: MutableRefObject<HTMLDivElement | null>, // used to scroll
}


type ASTComponent = ({ ASTNode, context }: { ASTNode: AST, context?: Partial<HTMLContextType> }) => React.ReactNode


type getHTMLFnInputs = {
    ASTNode: AST, context: HTMLContextType,
    globalASTFields: GlobalASTFields, schemaInfo: SchemaInfo,
    globalState: GlobalState, ASTComponent: ASTComponent,
    init_context: HTMLContextType
}
type getHTMLFn = null | ((props: getHTMLFnInputs) => React.ReactNode)


type ASTBuilderFnIputs = {
    ASTNode: AST, context: ASTBuilderContextType,
    globalASTFields: GlobalASTFields, schemaInfo: SchemaInfo,
    globalState: GlobalState,
}

type inputtedFieldsNotKeptLater = {
    createSubstring: string,
    theseCanBeCreatedAsDirectChildren: string[],
    theseDirectChildrenCanCreateThisAsParent: string[],
    exitSubstring: string,
}
type inputtedFieldsKeptLater = {
    mustExitWithExitSubstring: boolean,
    canReuseExitSubstringAsCreateSubstring: boolean,
    childContext: Partial<ContextType>,
    parentsIgnoreText?: boolean,

    // used per type
    typeMetadata?: TypeMetadata,

    ignoreText?: boolean,

    // these all take place when generating the AST and globalASTFields
    // these are all used in computeASTs
    _0_initGlobalASTFields?: () => Partial<GlobalASTFields>,
    _1_onFinalizeASTNode?: (i: Omit<ASTBuilderFnIputs, 'context'>) => void
    _2_onPreorderTraverseASTNode?: (i: ASTBuilderFnIputs) => Partial<ASTBuilderContextType> | void
    _3_finally_ASTRoot?: (i: Omit<ASTBuilderFnIputs, 'context'>) => void // ASTNode = the root node

    getHTML: getHTMLFn,
}
type newlyExtractedFields = {
    directParentTypeOfAllowedNestedChildTypeCreatableHere: { [childName: string]: string | null },
}
// partial means make all fields optional, ie allow undefined as a type
type user_specified_schema = Partial<inputtedFieldsNotKeptLater & inputtedFieldsKeptLater>
type user_specified_schema_of_type = { [typeName: string]: user_specified_schema }
type schemaInfoFields = inputtedFieldsKeptLater & newlyExtractedFields

//combines default type schema AND root schema AND raw text schema
// creates tries
class SchemaInfo {
    createTrie = new Trie()
    exitTrie = new Trie()
    // infoOfType = all the schema info that didn't get extracted into createTrie, exitTrie.
    // NOTE: infoOfType assumes EVERY [typeName:string] key returns an extractedSchemaFields output. 
    // To avoid this, change to extractedSchemaFields | undefined.
    // we assume it's not a problem and all referencing is done correctly.
    infoOfType: { [typeName: string]: schemaInfoFields } = {}

    constructor(schema_of_type: user_specified_schema_of_type) {
        let localInfoOfType = {}

        for (let typeName in schema_of_type) {
            const {
                createSubstring = null,
                theseCanBeCreatedAsDirectChildren = [],
                theseDirectChildrenCanCreateThisAsParent = [],

                exitSubstring = null,
                mustExitWithExitSubstring = false, // FOR MATH $ and SWS >>. Can't exit up till first reach an exit token.
                canReuseExitSubstringAsCreateSubstring: canReuseExitSubstring = false, // FOR TABLE |.

                // mustNotExitUpToCreateThis = false, // FOR TABLE |. // usually, try to add the section by exiting up to where it's allowed
                childContext = {}, //{ a, b },

                // TODO! how to manage corrections, like typing content `a` and converting that to `#a`?
                getHTML = null, //ASTNode.children.map(child => child.HTML), // ({ context, ASTNode, asOutline }),
            } = schema_of_type[typeName]


            if (createSubstring)
                this.createTrie.insert(createSubstring, typeName)
            if (exitSubstring)
                this.exitTrie.insert(exitSubstring, typeName)

            localInfoOfType[typeName] = {
                theseCanBeCreatedAsDirectChildren: theseCanBeCreatedAsDirectChildren,
                theseDirectChildrenCanCreateThisAsParent: theseDirectChildrenCanCreateThisAsParent,
            }
            // console.log('typeName', typeName)

            this.infoOfType[typeName] = {
                ...schema_of_type[typeName],

                mustExitWithExitSubstring: mustExitWithExitSubstring,
                canReuseExitSubstringAsCreateSubstring: canReuseExitSubstring,

                childContext: childContext,
                getHTML: getHTML,

                // the path up of any child that can be created here,
                // ie {childType1 -> null, ..., twiceNested[0] -> childType1, thriceNested[0] -> twiceNested[0]}
                directParentTypeOfAllowedNestedChildTypeCreatableHere: {},

            }
        } // end loop over all types

        for (let typeName in this.infoOfType) {
            let setDirectParentTypeOfAllowedNestedChildTypeCreatableHere = (parentName, directChildrenNames) => {
                for (let childName of directChildrenNames) {
                    this.infoOfType[typeName].directParentTypeOfAllowedNestedChildTypeCreatableHere[childName] = parentName
                    setDirectParentTypeOfAllowedNestedChildTypeCreatableHere(childName, localInfoOfType[childName].theseDirectChildrenCanCreateThisAsParent)
                }
            }
            setDirectParentTypeOfAllowedNestedChildTypeCreatableHere(null, localInfoOfType[typeName].theseCanBeCreatedAsDirectChildren)
        }

        // done with constructor.
        // console.log('schemaInfo', this)
    }
}

export default SchemaInfo

export type {
    user_specified_schema, user_specified_schema_of_type,
    ContextType, HTMLContextType, HTMLOnlyContextType,
    getHTMLFn, getHTMLFnInputs,
    TypeMetadata, ASTNodeMetadata, GlobalASTFields, GlobalState
}