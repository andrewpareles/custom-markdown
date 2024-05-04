import { useMemo } from "react"
import default_schema from "./default_schema"
import ExtractedSchemaInfo, { HTMLContextType, user_specified_schema_of_type } from "./ExtractedSchemaInfo"



const computeSchemaInfo = ({ schema = default_schema, theseCanBeCreatedAsDirectRootChildren, childContext }: {
    schema?: user_specified_schema_of_type,
    theseCanBeCreatedAsDirectRootChildren: string[],
    childContext: HTMLContextType
}) => {
    return new ExtractedSchemaInfo({
        ...schema,
        'root': {
            ...schema['root'],
            theseCanBeCreatedAsDirectChildren: [
                ...schema['root'].theseCanBeCreatedAsDirectChildren || [],
                ...theseCanBeCreatedAsDirectRootChildren
            ],
            childContext: {
                ...schema['root'].childContext,
                ...childContext,
            }
        }
    })
}

const defaultSchemaInfo = computeSchemaInfo({
    theseCanBeCreatedAsDirectRootChildren: ['subsection', 'block'],
    childContext: {
        ID_prefix: '',
        inArgs: false,
        useIDs: true,
        canHaveImages: true,
        inRefPreview: false,
        asOutline: false,
    }
})


export default defaultSchemaInfo
