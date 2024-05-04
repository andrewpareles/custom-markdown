
import { useMantineTheme, ColorScheme, Box, MantineNumberSize, BoxProps, Flex, Overlay, Tooltip } from '@mantine/core'
import MonacoEditor from '@monaco-editor/react'
import { editor } from 'monaco-editor'
import React, { useState, useRef, useEffect, CSSProperties, useCallback, memo, useMemo } from 'react'

type modelRefType = React.MutableRefObject<editor.ITextModel | null>


const useHeight = (height: '100%' | 'auto' | number, initValue: string): ['100%' | number, ((height: number) => void) | null] => {
    // this is all for when height is auto
    const height_per_line = 19
    let init_num_lines = initValue.split('\n').length // init approximate height (might be slightly off due to line wrapping)
    const [content_height, set_content_height] = useState(height_per_line * init_num_lines)

    // if height is 100%, just use 100%
    if (height !== 'auto')
        return [height, null]

    return [content_height, set_content_height]
}


type BigCodeProps = {
    height: '100%' | 'auto' | number,

    isPseudocode?: boolean,
    language: 'python' | 'plaintext',
    onChangeText?: () => void, //(newText: string) => void,
    boxProps?: BoxProps,
    options?: editor.IStandaloneEditorConstructionOptions,
    modelRef?: modelRefType,

    onCtrlEnter?: () => void,
    onCtrlQuote?: () => void,
}

function BigCodeNoMemo(props: BigCodeProps & { initValue: string }) {

    const { initValue, isPseudocode, height, language, onChangeText, boxProps, options, modelRef, onCtrlEnter, onCtrlQuote } = props

    const theme = useMantineTheme()
    const dark = theme.colorScheme === 'dark'

    const [editor_height, set_editor_height] = useHeight(height, initValue)

    return (<Box
        py={10}
        // my={10}
        h={height} // 100% | auto
        style={{ borderRadius: 6, overflow: 'hidden', }}
        {...boxProps}
        pos='relative'
    >

        <MonacoEditor
            onMount={(editor, monaco) => {
                // if auto size, update height
                if (height == 'auto') {
                    const fn = () => set_editor_height!(editor.getContentHeight())
                    editor.onDidContentSizeChange(fn)
                    fn()
                }

                // disable ctrl+enter 
                const model = editor.getModel()
                model?.setEOL(monaco.editor.EndOfLineSequence.LF)
                if (modelRef)
                    modelRef.current = model

                // if you want, set up custom python syntax highlighting, after digging I found this as reference - https://github.com/microsoft/monaco-editor/blob/main/src/basic-languages/python/python.ts
                // monaco.languages.register({ id: 'pythonCustom' });
                // monaco.languages.setLanguageConfiguration('pythonCustom', customPythonConf(monaco))
                // monaco.languages.setMonarchTokensProvider('pythonCustom', customPythonLanguage);
            }}
            loading=''
            defaultValue={initValue}
            defaultLanguage={language === 'python' ? 'pythonCustom' : language}

            onChange={() => { onChangeText?.() }}
            height={editor_height} // 100% or the exact pixel height
            theme={dark ? `deriveit-dark` : 'deriveit-light'}


            options={{
                matchBrackets: 'always',
                detectIndentation: false, // we always want a tab size of 4
                tabSize: 4,
                insertSpaces: true,

                // glyphMargin: false,
                // renderIndentGuides: false,



                // fontSize: 15,
                wordWrapColumn: 10000, // we want this to be infinity
                // automaticLayout: true,
                wordWrap: 'bounded', // 'off'
                // wordBreak: 'keepAll',
                // automaticLayout: true,
                // lineDecorationsWidth: 0,
                lineNumbersMinChars: 4,
                lineNumbers: isPseudocode ? 'off' : 'on',
                renderLineHighlight: 'none',
                minimap: { enabled: false },
                scrollBeyondLastColumn: 0,
                scrollBeyondLastLine: false,
                scrollbar: {
                    alwaysConsumeMouseWheel: false, //height !== undefined
                    // vertical: 'hidden',
                    // horizontal: 'hidden'
                },

                overviewRulerLanes: 0,
                readOnly: !onChangeText,
                quickSuggestions: false,

                ...options
            }}
        />
    </Box>
    )
}


// if code is undefined, return null, else render BigCode
const BigCode = (props: BigCodeProps & { initCode: string | undefined } & { modelRef?: modelRefType }) => {
    const { initCode, isPseudocode, height, language, onChangeText, boxProps, options, modelRef, onCtrlEnter, onCtrlQuote } = props // destructure so memo works (aka the effect below)...


    // render if there's an initValue
    return useMemo(() => {
        if (initCode === undefined)
            return null

        return <BigCodeNoMemo
            initValue={initCode}
            isPseudocode={isPseudocode}
            height={height}
            language={language}
            onChangeText={onChangeText}
            boxProps={boxProps}
            options={options}
            modelRef={modelRef}

            onCtrlEnter={onCtrlEnter}
            onCtrlQuote={onCtrlQuote}
        />

    }, [initCode, isPseudocode, height, language, onChangeText, boxProps, options, modelRef, onCtrlEnter, onCtrlQuote])

}



export default BigCode