import { useMemo } from "react"
import default_schema from "./default_schema"
import SchemaInfo, { HTMLContextType, user_specified_schema_of_type } from "./SchemaInfo"




const rootSchemaOfType = {
    'title': {
        theseCanBeCreatedAsDirectRootChildren: ['inline'],
        childContext: {
            ID_prefix: 'title',
            inArgs: true,
            useIDs: true,
            canHaveImages: false,
            inRefPreview: false,
            asOutline: false,
        }
    },
    'desc': {
        theseCanBeCreatedAsDirectRootChildren: ['inline'],
        childContext: {
            ID_prefix: 'desc',
            inArgs: false,
            useIDs: true,
            canHaveImages: false,
            inRefPreview: false,
            asOutline: false,
        }
    },
    'body': {
        // TODO allow for removal of 'inline' here?

    }
}


const computeSchemaInfo = ({ schema = default_schema, theseCanBeCreatedAsDirectRootChildren, childContext }: {
    schema?: user_specified_schema_of_type,
    theseCanBeCreatedAsDirectRootChildren: string[],
    childContext: HTMLContextType
}) => {
    return new SchemaInfo({
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
