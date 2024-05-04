import ExtractedSchemaInfo, { HTMLContextType, user_specified_schema_of_type } from "./ExtractedSchemaInfo"



const computeSchemaInfo = ({ schema, theseCanBeCreatedAsDirectRootChildren, childContext }: {
    schema: user_specified_schema_of_type,
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

export default computeSchemaInfo