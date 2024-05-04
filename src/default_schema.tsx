import React, { Fragment, useEffect, useMemo, useRef, useState, DOMAttributes, useCallback } from 'react'

import { AST } from './AST'
import type { GlobalState, ASTNodeMetadata, getHTMLFnInputs, user_specified_schema_of_type, user_specified_schema, GlobalASTFields, HTMLContextType } from './ExtractedSchemaInfo'

import { ActionIcon, Box, Button, Card, Chip, Code, Collapse, Divider, Flex, Group, MantineTheme, Overlay, Popover, ScrollArea, Spoiler, type Sx, Text, ThemeIcon, Title, useMantineTheme, MantineColor, BoxProps } from '@mantine/core'
import { Paper, Portal, Transition } from "@mantine/core"
import { useDisclosure, useHover, useScrollIntoView, useTimeout, useElementSize, useClickOutside } from "@mantine/hooks"
import { IconAdjustments, IconAlertTriangle, IconBrandDiscord, IconBrandLeetcode, IconBulb, IconBulbFilled, IconBulbOff, IconChevronDown, IconChevronUp, IconExternalLink, IconEye, IconEyeClosed, IconX, IconYinYangFilled } from '@tabler/icons-react'




import ErrorBoundary from './ErrorBoundary'
import BigCode from './BigCode'



// _ is reserved in html/css IDs for our internal use only
const ID_RESERVED_DELIMETER = '_' // for internal use only

// remove not allowed characters and make sure it starts correctly
const ID_character_sanitize = (text: string) => {
    const WHITESPACE_DELIMETER = '-'

    text = text.trim()
    text = text.toLowerCase()
    text = text.replaceAll(/\s+/g, WHITESPACE_DELIMETER)
    text = text.replaceAll(/[^a-zA-Z0-9\-]/g, '')// remove all but a-z A-Z 0-9 "-"
    text = text.replaceAll(/\-+/g, '-')
    if (text[0]?.match(/[0-9]/))
        text = ID_RESERVED_DELIMETER + text
    return text
}




const max_len_slugid = 100

// amount of space for adding collision detection to end of an id, eg -2, -3, ...
// once ~10^(this number) of the same contentid have been seen, errors can happen since collisions can happen, eg:  
// aaaaa aaaaa -> aaaaa aaa-2
// aaaa  aaaa  -> aaaa  aaa-2 
const slugid_space_reserved_for_counting = 10


import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'



const getContainerTopAndBottom = (container: HTMLDivElement | null) => {
    const containerRect = container?.getBoundingClientRect()
    const containerYBottom = containerRect ? containerRect.bottom : window.innerHeight
    const containerYTop = containerRect ? containerRect.top : 0
    return [containerYTop, containerYBottom]
}


const headerHeight = 0 // if you have a header, set this to its height

// container defaults to window, ie "fixed" container position
const checkVisibility = (target: HTMLDivElement, container: HTMLDivElement | null) => {
    // header box
    const headerRect = target.getBoundingClientRect()
    const { bottom: headerRefYBottom, top: headerRefYTop } = headerRect

    // container box
    const [containerYTop, containerYBottom] = getContainerTopAndBottom(container)

    const isTotallyAbove = headerRefYBottom < containerYTop + headerHeight // totally above container
    const isTotallyBelow = headerRefYTop > containerYBottom // totally below container

    return [isTotallyAbove, isTotallyBelow]
}


// headerHasHeight means need to scroll to an offset (else just scroll to very top)
// TODO! delete this:
const useScrollEltRightBelowHeader = (type: 'always' | 'onlyIfOffScreen' = 'always', duration?: number) => {
    const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<HTMLDivElement, HTMLDivElement | null>({ duration: duration ?? 500, offset: headerHeight })

    let scroll = useCallback(() => {
        if (type === 'always') {
            scrollIntoView({ alignment: 'start' })
            return
        }
        if (type === 'onlyIfOffScreen') {
            const [isAbove, isBelow] = checkVisibility(targetRef.current, scrollableRef.current)
            if (isAbove || isBelow)
                scrollIntoView({ alignment: 'start' })
            // TODO need to make it so if scrolling down, that thing get scrolled to top, otherwise it gets scrolled to bottom.
            // if (isBelow)
            //     scrollIntoView({ alignment: 'end' })
            return
        }
    }, [targetRef, scrollableRef, scrollIntoView, type])



    return { scroll, targetRef, scrollableRef }
}





import NextLink, { LinkProps } from 'next/link'
import Image from 'next/image'

function Link(props: Omit<React.HTMLProps<HTMLAnchorElement>, 'ref'> & { href: string } & { color?: MantineColor, hoverColor?: MantineColor, regularText?: boolean } & BoxProps & LinkProps) {
    const { children, hoverColor, color, href, regularText, ...others } = props

    const theme = useMantineTheme()
    const dark = theme.colorScheme === 'dark'


    let regTextCol = regularText && (dark ? theme.colors.dark[1] : theme.black)

    const colorSx: Sx = {
        color: regTextCol || color || theme.colors.blue[6],
        ':hover': {
            color: regTextCol || hoverColor || theme.colors.blue[8]
        },
    }
    return <Box sx={colorSx} component={NextLink} display='contents' href={href.trim()} {...others}>{children}</Box>
}




const CustomErrorHTML = (children: React.ReactNode) => {
    return <b style={{ color: 'red' }}>{children}</b>
}

const ChildComponent = (childNode: AST, parentHTMLInputs: getHTMLFnInputs) => {
    return parentHTMLInputs.ASTComponent({ ASTNode: childNode, context: { ...parentHTMLInputs.context, ...parentHTMLInputs.schemaInfo.infoOfType[childNode.type].childContext } })
}


const ChildrenErrorHTML = (ASTNode: AST, parentHTMLInputs: getHTMLFnInputs) => {
    return CustomErrorHTML(ASTNode.children.map((childNode, index) => childNode.metadata.error ? <Fragment key={index}>{ChildComponent(childNode, parentHTMLInputs)}</Fragment> : null))
}


// is return null necessary (return null so can detect emptiness)? Ans - not if we're not iterating over anything!
const ChildrenComponents = (inputs: getHTMLFnInputs, start?: number, end?: number) => {
    return inputs.ASTNode.children.slice(start, end).map((childNode, index) => <Fragment key={index}>{ChildComponent(childNode, inputs)}</Fragment>)
}


const MathErrorBoundary = ({ children }) => {
    return <ErrorBoundary fallback={CustomErrorHTML(`[Error rendering KaTeX]`)}>{children}</ErrorBoundary>
}


const ThemeComponent = ({ children }: { children: (theme: MantineTheme) => React.ReactNode }) => {
    const theme = useMantineTheme()
    return children(theme)
}



const Paragraph = ({ children, paragraphify, paragraphID, isSelectable }) => {
    if (paragraphID && !paragraphify)
        throw Error('paragraphID was specified, but !paragraphify.')

    let className = isSelectable ? 'selectable' : ''
    let returnRender = paragraphify ?
        <p className={className} id={paragraphID} style={{ margin: '10px 0' }}>{children}</p>
        : <span className={className}>{children}</span>
    return returnRender
}




// ids must start with a letter, _, or -, and contain only those and numbers.
// it must not start with a number, and must be nonempty (can't be '').
// this guarantees all of those things.
const sanitize_and_assign_ID = (prefix_arr: string[], desID_input: string, MUTATE_globalASTFields_desIDcount: GlobalASTFields['desIDcount']) => {
    // console.log(prefix_arr, desID_input, desIDcount)

    // sanitize & join prefix array
    prefix_arr = prefix_arr.map(ID_character_sanitize)
    prefix_arr = prefix_arr.filter((s) => !!s)
    let prefix_final = prefix_arr.join(ID_RESERVED_DELIMETER)

    // sanitize desID_input
    desID_input = ID_character_sanitize(desID_input)

    // create final desID
    let desID = prefix_final + (prefix_final ? ID_RESERVED_DELIMETER : '') + desID_input
    desID = desID || 'empty' // make it so ID can't be empty

    // visit
    desID = desID.substring(0, max_len_slugid - slugid_space_reserved_for_counting)
    const total_visited = (MUTATE_globalASTFields_desIDcount[desID] || 0) + 1
    // need to be able to include the full postfix in the ID
    MUTATE_globalASTFields_desIDcount[desID] = total_visited

    const postfix = total_visited === 1 ? '' : `${ID_RESERVED_DELIMETER}${total_visited}`
    const assignedID = desID + postfix
    return assignedID
}


// if in text in subsection, we perform operation on section, eg unminimize section (not subsection)
// same for if in section.args, we don't want to unminimize subsection
// if operation returns a value, we return that value
// const operationOnAllLowerDepthCollapsibles = (ASTNode: AST, operationOnLowerDepths: (ASTParent: AST) => void | unknown) => {
//     let exited_nearest_collapsible = false
//     for (let curr_node: AST | null = ASTNode; curr_node !== null; curr_node = curr_node.parent) {

//         let isMinimized = curr_node.metadata.isMinimized
//         if (isMinimized === undefined)
//             continue

//         // if isMinimized is a boolean, we're in a collapsible.
//         if (!exited_nearest_collapsible) {
//             exited_nearest_collapsible = true
//             continue
//         }

//         let x = operationOnLowerDepths(curr_node)
//         if (x)
//             return x
//     }
// }


const useUnminimizeAndScrollToNode = ({ ASTNode, id, globalState }: { ASTNode: AST, id?: string, globalState: GlobalState }) => {
    const { scroll, targetRef, scrollableRef } = useScrollEltRightBelowHeader('always', 0)

    // could do this all in a setTimeout if need to:
    const new_scroll = () => {
        //unminimizeLowerDepthParents
        // operationOnAllLowerDepthCollapsibles(ASTNode, (ASTParent) => globalState.setAssignedIDisMinimized(ASTParent.metadata.assignedID!, false))

        if (!id) {
            console.error(`id was undefined`)
            return
        }
        const elt = document.getElementById(id)
        if (!elt) {
            console.error(`elt not found with id ${id}`)
            return
        }
        targetRef.current = elt as HTMLDivElement
        scrollableRef.current = globalState.scrollContainerRef.current

        // for some reason, this fixes it
        // TODO!!!! remove this crap
        setTimeout(scroll, 100)
    }

    return new_scroll

}


type LinkToHashtagIdProps = {
    to_id?: string,
    sx?: Sx,
    children: React.ReactNode,
} & DOMAttributes<HTMLAnchorElement>
const LinkToHashtagId = (props: LinkToHashtagIdProps) => {
    const { to_id, sx, children, onClick, ...others } = props
    const href = to_id ? `#${to_id}` : ''
    return (
        <Box component={'a'}
            sx={[sx, {
                textDecoration: 'none',
                ':hover': { textDecoration: 'underline' },
                ':is(:active)': { textDecoration: 'none' }
            }]}
            href={href}
            onClick={(event) => {
                event.preventDefault()
                onClick?.(event)
                window.history.replaceState({}, '', href)
            }}
            {...others}
        >
            {children}
        </Box>
    )
}




const linkColorSx = (color: string | ((t: MantineTheme) => string)) => {
    const colorSx: Sx | undefined = typeof color === 'function' ? (theme) => ({ color: color(theme), ':hover': { color: color(theme) } })
        : typeof color === 'string' ? { color, ':hover': { color } }
            : undefined
    return colorSx
}


type ScrollableLinkToHashtagIdProps = {
    ASTNode: AST,
    children: React.ReactNode,
    globalState: GlobalState,
    color: string | ((t: MantineTheme) => string),
}
const ScrollableLinkToHashtagId = ({ ASTNode, children, globalState, color }: ScrollableLinkToHashtagIdProps) => {
    const id = ASTNode.metadata.assignedID
    const scroll = useUnminimizeAndScrollToNode({ ASTNode, id, globalState })
    if (!id) {
        console.error(`Element with id ${id} not found`)
        return null
    }

    const colorSx = linkColorSx(color)

    return <LinkToHashtagId to_id={id} sx={colorSx} onClick={scroll}>{children}</LinkToHashtagId>
}




type FeynmanRefPreviewProps = {
    // takes in AST node HTML to show if preview not at all visible, 
    // and ASTNode and globalState so it can uncollapse, and globalState for headerHeight for scrolling
    labeledASTNode: AST,
    labeledASTNodeHTML: React.ReactNode,
    globalState: GlobalState,

    // preview id to check if visible
    previewID: string,

    // link contents (children)
    linkProps: LinkToHashtagIdProps,
}

const FeynmanRefPreview = (props: FeynmanRefPreviewProps) => {
    const {
        labeledASTNode,
        labeledASTNodeHTML,
        globalState,

        previewID,
        linkProps
    } = props

    const { noteContainerRef, scrollContainerRef } = globalState
    // console.log('FEYNMAN', noteContainer)


    // whether mouse is hovering
    const [isHovering, { open: setHovering, close: setNotHovering }] = useDisclosure(false)

    // need preview height
    const previewRef = useRef<HTMLDivElement | null>(null)
    const [{ previewHeight }, setPreviewDims] = useState<{ previewHeight: number }>({ previewHeight: 0 })
    // need note left and width
    const [{ noteLeft, noteWidth }, setNoteDims] = useState<{ noteLeft: number, noteWidth: number }>({ noteLeft: 0, noteWidth: 0 })
    // need container top and bottom
    const [{ containerTop, containerBottom }, setContainerDims] = useState<{ containerTop: number, containerBottom: number }>({ containerTop: 0, containerBottom: 0 })


    // targetEltState = 'none' iff !isHovering
    const [targetEltState, setTargetEltState] = useState<'above' | 'below' | 'onScreen' | 'none'>('none')
    const getTargetElt = useCallback(() => document.getElementById(previewID) as HTMLDivElement | null, [previewID])

    // console.log('noteContainer', noteContainer)
    // console.log('targetEltState', targetEltState)
    // console.log('dims', { previewHeight, noteLeft, noteWidth, containerTop, containerBottom })
    const [isScrolling, { open: setScrolling, close: setNotScrolling }] = useDisclosure(false)
    const isHighlighted = isHovering || isScrolling


    const updateTargetHighlight = (targetElt: HTMLDivElement | null, isHighlighted: boolean) => {
        if (targetElt) {
            targetElt.style.transition = 'background-color .3s ease-in-out, box-shadow .3s ease-in-out'
            targetElt.style.backgroundColor = isHighlighted ? 'yellow' : ''
            targetElt.style.boxShadow = isHighlighted ? '0 0 3px 3px yellow' : ''
        }
    }

    const onHoverChange = () => {
        const targetElt = getTargetElt()

        // highlight/remove highlight
        updateTargetHighlight(targetElt, isHighlighted)

        // only update target when start hovering (not when stop, ie not when !isHovering)
        if (!isHovering)
            return

        // set dimensions
        const previewRect = previewRef.current?.getBoundingClientRect()
        if (previewRect)
            setPreviewDims({ previewHeight: previewRect.height })

        const noteRect = noteContainerRef.current?.getBoundingClientRect()
        if (noteRect)
            setNoteDims({ noteWidth: noteRect.width, noteLeft: noteRect.left })

        const containerRect = scrollContainerRef.current?.getBoundingClientRect()
        if (containerRect)
            setContainerDims({ containerTop: containerRect.top, containerBottom: containerRect.bottom })
        else
            setContainerDims({ containerTop: 0, containerBottom: window.innerHeight })

        if (!targetElt) {
            // render as if not visible, deciding above or below based on AST location
            // TODO!!!
            setTargetEltState('above')
            return
        }
        const [isTotallyAbove, isTotallyBelow] = checkVisibility(targetElt, scrollContainerRef.current)
        if (isTotallyAbove) {
            setTargetEltState('above')
            return
        }

        if (isTotallyBelow) {
            setTargetEltState('below')
            return
        }

        setTargetEltState('onScreen')
    }

    useEffect(onHoverChange, [isHovering, getTargetElt, isHighlighted, noteContainerRef, scrollContainerRef])


    // TODO! the highlight stays whenever the hovering component dismounts (if it's in a detail). I thought this would fix it, but it doesn't:
    // useEffect(() => {
    //     if (isScrolling)
    //         return
    //     // whenever stop scrolling, turn off highlight
    //     updateTargetHighlight(getTargetElt(), false)
    // }, [isScrolling])




    // TODO use a built in window.scroll, mantine is laggy and unreliable
    const scrollDuration = 500
    const { scrollIntoView, targetRef: t, scrollableRef: s } = useScrollIntoView<HTMLDivElement, HTMLDivElement | null>({ duration: scrollDuration, offset: headerHeight })


    const { start: setNotScrolling_soon } = useTimeout(() => { setNotScrolling(); setNotHovering(); }, scrollDuration)

    const onClick = () => {
        if (targetEltState === 'onScreen') {
            // TODO! flash extra dark
            return
        }

        // unminimize the target so it's visible
        // operationOnAllLowerDepthCollapsibles(labeledASTNode, (ASTParent) => {
        //     if (ASTParent.metadata.isMinimized)
        //         globalState.setAssignedIDisMinimized(ASTParent.metadata.assignedID!, false)
        // })
        const new_targetElt = getTargetElt()

        // at this point, target should be visibe. TODO!!! double check this!!!
        // TODO useScrollToEltOnceMounted
        t.current = new_targetElt!

        s.current = scrollContainerRef.current

        if (targetEltState === 'above' || targetEltState === 'below') {
            scrollIntoView({ alignment: 'start' })
            setScrolling()
            setNotScrolling_soon()
        }

    }



    return (<>
        <LinkToHashtagId
            {...linkProps}
            onClick={onClick}
            onMouseEnter={setHovering}
            onMouseLeave={setNotHovering}
        />
        <Portal><Transition transition='fade' mounted={(isHovering && !isScrolling && (targetEltState === 'below' || targetEltState === 'above'))}>{(styles) =>
            <ScrollArea.Autosize
                onClick={onClick} // this is just here in case overlay doesn't fully cover ScrollArea due to margin
                styles={{
                    root: {
                        // transition: 'background-color 3s ease-in-out',
                        // transitionDelay: '.5s',
                        backgroundColor: 'yellow',
                    }
                }}
                sx={theme => ({ boxShadow: theme.shadows.lg })}
                type='auto'
                offsetScrollbars={false}
                onMouseEnter={setHovering}
                onMouseLeave={setNotHovering}
                ref={previewRef}
                style={{
                    ...styles,
                    background: 'white',
                    zIndex: 10,

                    // position fixed + sizing
                    position: 'fixed',
                    left: noteLeft,
                    width: noteWidth,
                    top: containerTop + headerHeight,
                    maxHeight: `${.4 * 100}vh`,
                    outline: '1px solid black'
                }}>
                <Box m={0} p={0} pos='relative' w={noteWidth}>
                    {labeledASTNodeHTML}
                    <Overlay opacity={0} onClick={onClick} />
                </Box>

            </ScrollArea.Autosize>}
        </Transition>
            <Transition mounted={isHovering && (targetEltState === 'below' || targetEltState === 'above')} transition='fade'>
                {(styles) => <Box style={{
                    borderRadius: 30,
                    backgroundColor: 'white',
                    border: '1px solid black',
                    ...styles,
                    position: 'fixed',
                    left: noteLeft - 30,
                    top: containerTop + headerHeight + 3,
                }}><Box w={30} h={30}>{targetEltState === 'below' ? <IconChevronDown size={30} /> : <IconChevronUp size={30} />}</Box></Box>}
            </Transition>
        </Portal>
    </>
    )

}


const SpoilerComponent = ({ children }: { children: React.ReactNode, props: getHTMLFnInputs }) => {
    const [opened, { toggle }] = useDisclosure(false)
    return <Box pos='relative'>
        <Button variant='default' compact size='sm' mx='auto' display='block' onClick={toggle}>{`${!opened ? 'Open' : 'Close'} Spoiler`}</Button>
        <Collapse in={opened}>
            <Paper shadow='sm' withBorder>
                <Box m={10}>{children}</Box>
            </Paper>
        </Collapse>
    </Box>
}


const DetailComponent = ({ children, props }: { children: React.ReactNode, props: getHTMLFnInputs }) => {
    // TODO maxwidth = width of note container
    const noteContainer = props.globalState.noteContainerRef.current
    const noteRect = noteContainer?.getBoundingClientRect()
    const maxWidth = Math.min(noteRect?.width || 300, 600)

    const [hovering, { open: hoveringTrue, close: hoveringFalse }] = useDisclosure(false)

    const [permaopen, { toggle: togglePermaOpen }] = useDisclosure(false)

    // const clickOutsideRef = useClickOutside(permaopenFalse)

    // don't need to do keepMounted here b/c we'll also put sidecomments at the bottom
    return (<Popover zIndex={2} shadow='sm' withinPortal middlewares={{ flip: false, shift: true, inline: true }} position='bottom-start' opened={hovering || permaopen}>
        <Popover.Target>
            <Box onClick={() => { togglePermaOpen(); hoveringFalse() }} component='span' sx={theme => ({ cursor: 'pointer', color: theme.colors.blue[5], fontWeight: 900, })} onMouseEnter={hoveringTrue} onMouseLeave={hoveringFalse}>
                {` `}
                <Box px={3} component='span' sx={theme => ({ textDecoration: 'underline' })}>{`*`}</Box>
                {` `}
            </Box>
        </Popover.Target>
        <Popover.Dropdown py={5} px={10} maw={maxWidth} onMouseEnter={hoveringTrue} onMouseLeave={hoveringFalse}>
            {children}
        </Popover.Dropdown>
    </Popover >)
}





const GetHTML_Subsection = (props: getHTMLFnInputs, order: 3) => {
    const { ASTNode, context, globalState } = props
    const [titleHTML, ...childrenHTML] = ChildrenComponents(props)

    const hasTitle = ASTNode.children[0].type === `${ASTNode.type}.args`

    // if (context.asOutline) {
    //     // we dont even have an outline anymore
    //     // let isVisible = operationOnAllLowerDepthCollapsibles(ASTNode, (ASTParent) => { if (ASTParent.metadata.isMinimized) return true })
    //     // outline link
    //     // return <div style={{ paddingLeft: 10, marginTop: 10, marginBottom: 5, lineHeight: '100%', }}>
    //     //     <ScrollableLinkToHashtagId ASTNode={ASTNode} globalState={globalState}
    //     //         color={theme => theme.colorScheme === 'dark' ? theme.white : theme.black}
    //     //         sx={({ fontWeight: 300, transition: '.1s', })}
    //     //     >{titleHTML}</ScrollableLinkToHashtagId>
    //     // </div>
    // }

    const titleID = ASTNode.metadata.assignedID
    if (!titleID) {
        console.error(`subsectionHTML had undefined or empty titleID: ${titleID}`, ASTNode)
        return <>[Error: undefined or empty titleID]</>
    }

    return (<Box id={titleID}>
        {hasTitle && <Title order={order} fz={24} my={10} mt={15}>
            {<ScrollableLinkToHashtagId ASTNode={ASTNode} globalState={globalState} color={theme => theme.colorScheme === 'dark' ? theme.colors.gray[2] : theme.black}>{titleHTML}</ScrollableLinkToHashtagId>}
        </Title>}
        {!hasTitle && titleHTML}
        {childrenHTML}
    </Box>)

}


const TipComponent = ({ text, color }: { text: string, color: (theme: MantineTheme) => string }) => {
    return <ThemeComponent>{(theme) =>
        <Text display='inline-block' span fw={900} px={3} color={theme.colors.dark[9]} style={{ borderRadius: 3 }} bg={color(theme)}>
            {text}
        </Text>
    }
    </ThemeComponent>
}

const tipsSchemas = (): user_specified_schema_of_type => {

    type color = (theme: MantineTheme) => string
    const tipScehma = ({ createSubstring, color }: { createSubstring: string, color: color }): user_specified_schema => ({
        theseCanBeCreatedAsDirectChildren: ['text'],
        createSubstring: `\\${createSubstring}{`,
        exitSubstring: '}',
        mustExitWithExitSubstring: true,

        canReuseExitSubstringAsCreateSubstring: false,

        getHTML(props) {
            const { ASTNode } = props
            if (props.context.asOutline)
                return null
            return <TipComponent text={ASTNode.text} color={color} />
        },
    })

    const tips: { name?: string, createSubstring: string, color: color }[] = [
        { createSubstring: 'tip', color: theme => theme.colors.yellow[5], name: 'tip1_', },
        { createSubstring: 'tip1', color: theme => theme.colors.yellow[5] },
        { createSubstring: 'tip2', color: theme => theme.colors.violet[5] },
        { createSubstring: 'tip3', color: theme => theme.colors.green[5] },
    ]

    const customTipSchemas: user_specified_schema_of_type = {
        'recursion_step1': {
            createSubstring: '\\s1',
            // getHTML: () => <TipComponent text={`Step 0. Find the problem.`} color={theme => theme.colors.yellow[5]} />
            getHTML: () => <TipComponent text={`0. Problem`} color={theme => theme.colors.yellow[5]} />
        },
        'recursion_step1_condensed': {
            createSubstring: '\\sc1',
            getHTML: () => <TipComponent text={`0. Problem`} color={theme => theme.colors.yellow[5]} />
        },


        'recursion_step2': {
            createSubstring: '\\s2',
            // getHTML: () => <TipComponent text={`Step 1. Find the recursion.`} color={theme => theme.colors.yellow[5]} />
            getHTML: () => <TipComponent text={`1. Recursion`} color={theme => theme.colors.yellow[5]} />
        },
        'recursion_step2_condensed': {
            createSubstring: '\\sc2',
            getHTML: () => <TipComponent text={`1. Recursion`} color={theme => theme.colors.yellow[5]} />
        },


        'recursion_step3': {
            createSubstring: '\\s3',
            // getHTML: () => <TipComponent text={`Step 2. Find the base case.`} color={theme => theme.colors.yellow[5]} />
            getHTML: () => <TipComponent text={`2. Base case`} color={theme => theme.colors.yellow[5]} />
        },
        'recursion_step3_condensed': {
            createSubstring: '\\sc3',
            getHTML: () => <TipComponent text={`2. Base case`} color={theme => theme.colors.yellow[5]} />
        },


        'recursion_step4': {
            createSubstring: '\\s4',
            // getHTML: () => <TipComponent text={`Step 3. Code the solution.`} color={theme => theme.colors.yellow[5]} />
            getHTML: () => <TipComponent text={`3. Code`} color={theme => theme.colors.yellow[5]} />
        },
        'recursion_step4_condensed': {
            createSubstring: '\\sc4',
            getHTML: () => <TipComponent text={`3. Code`} color={theme => theme.colors.yellow[5]} />
        },


        'time_complexity': {
            createSubstring: '\\tc',
            getHTML: () => <TipComponent text={`Time Complexity`} color={theme => theme.colors.green[5]} />
        },
        'space_complexity': {
            createSubstring: '\\sc',
            getHTML: () => <TipComponent text={`Space Complexity`} color={theme => theme.colors.green[5]} />
        },


        'read_complexity': {
            createSubstring: '\\rc',
            getHTML: () => <TipComponent text={`Read Time Complexity`} color={theme => theme.colors.green[5]} />
        },
        'write_complexity': {
            createSubstring: '\\wc',
            getHTML: () => <TipComponent text={`Insert/Delete Time Complexity`} color={theme => theme.colors.green[5]} />
        },
        'create_complexity': {
            createSubstring: '\\cc',
            getHTML: () => <TipComponent text={`Create Time Complexity`} color={theme => theme.colors.green[5]} />
        },
    }


    let full_schema: user_specified_schema_of_type = {
        'tip': {
            // customSchemas and tips can be created here 
            theseDirectChildrenCanCreateThisAsParent: [...tips.map((t) => t.name ?? t.createSubstring), ...Object.keys(customTipSchemas)],
            getHTML: ChildrenComponents,
        }
    }
    // add tips schemas
    for (let tip of tips)
        full_schema[tip.name ?? tip.createSubstring] = tipScehma(tip)
    // add customs
    full_schema = { ...customTipSchemas, ...full_schema }

    return full_schema
}




const prefixSchema = (
    inputs: [string, { [name: string]: Omit<user_specified_schema, 'createSubstring' | 'exitSubstring'> }][]
): user_specified_schema_of_type => {
    const returnSchemas: user_specified_schema_of_type = {}

    for (let [prefixStr, schema] of inputs) {
        for (let typeName in schema) {

            // this is the schema for the children content of the prefix type (whatever comes after the #a)
            const section_dot_args = `${typeName}.args`

            // the type of the parent, typeName
            returnSchemas[typeName] = {
                ...schema[typeName],

                theseDirectChildrenCanCreateThisAsParent: [section_dot_args],
                childContext: { canHaveImages: true },

                typeMetadata: {
                    canBeLabeled: {
                        stampHTML: (count, inputs) => {
                            const { ASTNode, ASTComponent } = inputs
                            // generate the title's HTML (not the whole section's HTML)
                            // need to re-create context, because don't know it, everywhere else but here it's generated based on path
                            const titleContext = { ID_prefix: '', inArgs: true, canHaveImages: false, useIDs: false, inRefPreview: true, asOutline: false }
                            return ASTComponent({ ASTNode: ASTNode.children[0], context: titleContext })
                        },
                        stampCountKey: typeName,
                    },

                    desiredIDFn: ({ ASTNode }) => ASTNode.children[0].text,
                },
            }

            // the type of the child that creates the parent, ie the "args" schema type
            // this is the 'title' of the prefix type, eg the 'a' in #a
            returnSchemas[section_dot_args] = {
                theseCanBeCreatedAsDirectChildren: ['inline'],

                createSubstring: `\n${prefixStr}`,
                exitSubstring: '\n',
                mustExitWithExitSubstring: true,
                canReuseExitSubstringAsCreateSubstring: true,

                childContext: { inArgs: true, canHaveImages: false },

                getHTML: ChildrenComponents,
            }
        }
    }
    return returnSchemas
}


const default_schema: user_specified_schema_of_type = {

    '*': {

        // FOR DESIRED IDs
        _0_initGlobalASTFields: () => { return { desIDcount: {} } },

        _2_onPreorderTraverseASTNode: ({ globalASTFields, ASTNode, context, schemaInfo }) => {
            const { type } = ASTNode

            const desIDFn = schemaInfo.infoOfType[type].typeMetadata?.desiredIDFn
            if (!desIDFn)
                return

            if (!context.useIDs)
                return

            const desID_unprocessed = desIDFn({ ASTNode: ASTNode, context })
            if (desID_unprocessed === null)
                return

            ASTNode.metadata.assignedID = sanitize_and_assign_ID([context.ID_prefix], desID_unprocessed, globalASTFields.desIDcount)

            // context for labels
            if (schemaInfo.infoOfType[ASTNode.type].typeMetadata?.canBeLabeled)
                return { labelsApplyToThisNode: ASTNode }
        },

    },

    // built-ins
    'root': {
        getHTML: (props) => ChildrenComponents(props),
    },

    'text': {
        getHTML: ({ ASTNode }: { ASTNode: AST }) => ASTNode.text,
    },

    'ref': {
        theseCanBeCreatedAsDirectChildren: ['text'],
        createSubstring: `\\ref{`,
        exitSubstring: '}',
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,
        parentsIgnoreText: true,

        _0_initGlobalASTFields: () => ({ labelTextsWithARef: new Set(), stampOfLabelText: {} }),
        _1_onFinalizeASTNode: ({ globalASTFields, ASTNode }) => {
            globalASTFields.labelTextsWithARef.add(ASTNode.text)
        },

        _3_finally_ASTRoot: ({ globalASTFields, ASTNode, schemaInfo }) => {

            // only stamp labeledNodes that have a reference
            const stampCountOfStampCountKey: { [stampCountKey: string]: number } = {}
            for (let labelText in globalASTFields.labeledOfLabelText) {
                const labelNode = globalASTFields.labelOfLabelText[labelText]
                const labeledNode = globalASTFields.labeledOfLabelText[labelText]

                // if has a ref, give it a stamp, else dont
                if (!globalASTFields.labelTextsWithARef.has(labelText)) {
                    labelNode.metadata.error = `[${labelText}] unreferenced`
                    continue
                }

                const canBeLabeled = schemaInfo.infoOfType[labeledNode.type].typeMetadata?.canBeLabeled

                if (!canBeLabeled) {
                    labelNode.metadata.error = `Internal issue: Apparently, ${labeledNode.type} cannot be labeled`
                    continue
                }

                let { stampCountKey } = canBeLabeled
                if (!stampCountOfStampCountKey[stampCountKey])
                    stampCountOfStampCountKey[stampCountKey] = 1
                labeledNode.metadata.stampCount = stampCountOfStampCountKey[stampCountKey]++
            }
        },



        getHTML: (props) => {
            const { ASTNode, globalASTFields, globalState, schemaInfo: schemaInfo, init_context, context, ASTComponent, } = props
            const { text: labelText } = ASTNode
            if (!labelText || !(labelText in globalASTFields.labeledOfLabelText))
                return CustomErrorHTML(`[??]`)


            const labeledASTNode = globalASTFields.labeledOfLabelText[labelText]
            const stamp = schemaInfo.infoOfType[labeledASTNode.type].typeMetadata?.canBeLabeled?.stampHTML(labeledASTNode.metadata.stampCount, { ASTNode: labeledASTNode, ASTComponent })

            const labeledNodeID = labeledASTNode.metadata.assignedID!

            const linkProps: LinkToHashtagIdProps = {
                to_id: undefined, //labeledNodeID,
                sx: theme => ({
                    textDecoration: 'underline',
                    fontWeight: 'bold',
                    color: theme.colors.blue[5],
                    '&:hover': { color: theme.colors.blue[5] }
                }),
                children: stamp
            }
            if (context.inRefPreview)
                return <LinkToHashtagId {...linkProps} />

            // const labeledASTNodeHTML = OnlyRenderPathDownToNodeComponent(labeledASTNode, props, { ...init_context, useIDs: false, inRefPreview: true })
            const labeledASTNodeHTML = ASTComponent({ ASTNode: labeledASTNode, context: { ...context, useIDs: false, inRefPreview: true }, })

            return <FeynmanRefPreview
                labeledASTNode={labeledASTNode}
                labeledASTNodeHTML={labeledASTNodeHTML}
                globalState={globalState}
                previewID={labeledNodeID}
                linkProps={linkProps}
            />

        },

    },

    'label': {
        theseCanBeCreatedAsDirectChildren: ['text'],
        createSubstring: `\\label{`,
        exitSubstring: `}`,
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,
        parentsIgnoreText: true,

        _0_initGlobalASTFields: () => ({ labelOfLabelText: {}, labeledOfLabelText: {} }),

        _2_onPreorderTraverseASTNode: ({ globalASTFields, ASTNode, context }) => {

            const labelNode = ASTNode
            const proposedLabelText = ASTNode.text
            const labeledNode: AST = context.labelsApplyToThisNode

            if (!labeledNode) {
                labelNode.metadata.error = `invalid label location`
                return
            }

            if (!proposedLabelText) {
                labelNode.metadata.error = `empty label`
                return
            }

            // if already been labeled
            if (labeledNode.metadata.labeledByLabelText) {
                labelNode.metadata.error = `[${proposedLabelText}] is overwritten by [${labeledNode.metadata.labeledByLabelText}]`
                return
            }

            // label appears elsewhere
            if (proposedLabelText in globalASTFields.labeledOfLabelText) {
                labelNode.metadata.error = `[${proposedLabelText}] already used`
                return
            }

            labeledNode.metadata.labeledByLabelText = proposedLabelText
            globalASTFields.labeledOfLabelText[proposedLabelText] = labeledNode
            globalASTFields.labelOfLabelText[proposedLabelText] = labelNode
        },
        // ^ also uses '*' _2_context

        getHTML: ({ ASTNode, globalASTFields }) => {
            const error = ASTNode.metadata.error
            if (error) {
                return CustomErrorHTML(`<${error}>`)
            }
        },

        // TODO! also create a hidden dummy HTML to_reference (id="LABELID") to reveal if you hover over a from_reference (id="LABELID")
        // => can use css trick to make this easier?
    },

    // you use CONTEXT to allow images somewhere!!!
    'image': {

        theseCanBeCreatedAsDirectChildren: ['text', 'label'],

        createSubstring: `\\image{`,
        exitSubstring: `}`,
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,
        parentsIgnoreText: true,

        typeMetadata: {
            desiredIDFn: ({ ASTNode }) => `Image-${ASTNode.text}`,
            canBeLabeled: {
                stampHTML: (count) => count && `Image ${count}`,
                stampCountKey: 'default',
            },
        },

        _1_onFinalizeASTNode({ ASTNode, globalState }) {
            const imageText = ASTNode.text.trim()
            // code to integrate with deriveit's proprietiary (for now) pure CSS/html image cropper interface
            // if (!imageText || !(imageText in globalState.imageAndCropOfLabel)) {
            //     ASTNode.metadata.error = `[Image [${imageText}] not found]`
            // }
        },
        getHTML: (props) => {
            const { ASTNode, context, globalState, ASTComponent, schemaInfo: schemaInfo } = props
            if (context.asOutline)
                return null
            if (!context.canHaveImages)
                return CustomErrorHTML(`[Image not allowed here]`)

            // let [imageText = '', heightStr = ''] = ASTNode.text.split(',')
            // imageText = imageText.trim()
            // let maxHeight = parseInt(heightStr.trim())
            // let containerDims = !isNaN(maxHeight) ? { height: maxHeight, } : undefined
            // let imageHTML = imageText in globalState.imageAndCropOfLabel ?
            //     <ImageFromLabel imageAndCropOfLabel={globalState.imageAndCropOfLabel} label={imageText} containerDims={containerDims} />
            //     : CustomErrorHTML(`[Image [${imageText}] not found]`)
            // const stamp = schemaInfo.infoOfType[ASTNode.type].typeMetadata?.canBeLabeled?.stampHTML(ASTNode.metadata.stampCount, { ASTNode, ASTComponent })


            // you can create another schema entry so that you can also specify the alt, width, and height here:
            const imageHTML = <Image height={100} width={100} src={ASTNode.text} alt={ASTNode.text} />
            const errorHTML = ChildrenErrorHTML(ASTNode, props)

            return <div id={ASTNode.metadata.assignedID} style={{ margin: '10px 0', position: 'relative' }}>
                {imageHTML}
                {errorHTML}
            </div>


        }
    },

    'hline': {
        createSubstring: `\n--`, // TODO! do \n--(?:-*)\n

        getHTML: (props) => {
            if (props.context.asOutline)
                return null
            return <Divider my='lg' mx={'40%'} />
        },

    },


    ...tipsSchemas(),


    ...prefixSchema([
        ['##', {
            'subsection': {
                theseCanBeCreatedAsDirectChildren: ['block'],
                // _2_onPreorderTraverseASTNode: ({ ASTNode, globalState }) => {
                //     let assignedIsMinimized = globalState._isMinimizedOfAssignedID[ASTNode.metadata.assignedID!]
                //     ASTNode.metadata.isMinimized = assignedIsMinimized === undefined ? false : assignedIsMinimized
                // },
                getHTML: (props) => GetHTML_Subsection(props, 3),
            }
        }],
    ]),


    'splitdelimeter': {
        theseDirectChildrenCanCreateThisAsParent: ['inline'],
        // has no allowed children, so exits immediately
        createSubstring: '}}{{',
        getHTML(props) {
            return ChildrenComponents(props)
        },
    },

    'split': {
        theseCanBeCreatedAsDirectChildren: ['splitdelimeter', 'block'],
        createSubstring: '\\split{{',
        exitSubstring: '}}',
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,
        _1_onFinalizeASTNode(props) {
            const { ASTNode } = props

            // array of children, split by splitdelimeter
            const split_delimeters: number[] = []
            for (let i = 0; i < ASTNode.children.length; i += 1) {
                let child = ASTNode.children[i]
                if (child.type === 'splitdelimeter')
                    split_delimeters.push(i)
            }
            ASTNode.metadata.split_delimeters = split_delimeters
        },

        getHTML(props) {
            if (props.context.asOutline)
                return null

            const { ASTNode } = props
            const split_delimeters = ASTNode.metadata.split_delimeters!
            const n_cols = split_delimeters.length + 1

            const childHTML: React.ReactNode[] = []
            const push = (start_child_index: number, end_child_index: number) => {
                childHTML.push(<Fragment key={start_child_index}>
                    <Box w={`${100 / n_cols}%`} mx={10}>{ChildrenComponents(props, start_child_index, end_child_index)}</Box>
                </Fragment>)
            }
            let start_child_index = 0
            for (let i = 0; i < split_delimeters.length; i += 1) {
                let end_child_index = split_delimeters[i]
                push(start_child_index, end_child_index)
                start_child_index = end_child_index + 1
            }
            push(start_child_index, ASTNode.children.length)
            return <Flex wrap={{ base: 'wrap', md: 'nowrap' }} justify='center'>{childHTML}</Flex> // can also do alignItems: 'center'
        },
    },




    // 'swcontainer': {
    //     theseCanBeCreatedAsDirectChildren: ['swsection'],

    //     createSubstring: `\n<<`,
    //     exitSubstring: '\n>>',
    //     mustExitWithExitSubstring: true,
    //     canReuseExitSubstringAsCreateSubstring: false,

    //     getHTML: ({ ASTNode, childrenHTML, asOutline }) => asOutline ? childrenHTML : (<SidewaysContainer>{childrenHTML}</SidewaysContainer>)
    // },

    // // TODO! outline of sws is comma separated flexbox list of headers
    // ...sectionSchema({
    //     typeName: 'swsection',
    //     theseCanBeCreatedAsDirectChildren: ['inline', 'bigmath'],
    //     prefixStr: '#',
    //     getHTML: getHTML_Section,
    // }),

    // standard allowed block types
    'block': {
        theseDirectChildrenCanCreateThisAsParent: ['inline', 'image', 'bigmath', 'hline', 'split', 'bigcode', 'pseudocode', 'spoiler', 'subsection'],  // when you create text or math, it has to create a content node
        theseCanBeCreatedAsDirectChildren: ['inline', 'image', 'bigmath', 'hline', 'split', 'bigcode', 'pseudocode', 'spoiler', 'subsection'], // this isn't necessary, but it means paragraphs won't be created in separate 'block's, they'll all be in the same one
        getHTML(props) {
            return ChildrenComponents(props)
        },
    },

    /**
     * inline content (auto-created by default, this is specified in noteAST)
     */
    'inline': {
        theseDirectChildrenCanCreateThisAsParent: ['link', 'detail', 'text', 'math', 'bold', 'italics', 'label', 'ref', 'code', 'tip'],  // when you create text or math, it has to create a content node
        theseCanBeCreatedAsDirectChildren: ['link', 'detail', 'text', 'math', 'bold', 'italics', 'label', 'ref', 'code', 'tip'],

        exitSubstring: '\n\n',
        mustExitWithExitSubstring: false,
        canReuseExitSubstringAsCreateSubstring: true, // TODO! need to be able to reuse \n. Instead, just use <START> as substring, need to see 2 start newlines with whitespace only, incorporate regex

        typeMetadata: {
            desiredIDFn: ({ context, ASTNode }) => {
                return context.inArgs ? null : ASTNode.text
            },
        },

        _1_onFinalizeASTNode({ ASTNode }) {
            const contents: ASTNodeMetadata['paragraphs'] = []
            let curr_paragraph_nodes: AST[] = []

            const flush_curr_paragraph = () => {
                if (curr_paragraph_nodes.length === 0)
                    return

                // console.log('CURR PARAGRAPH', curr_paragraph_nodes)
                const matchNonEmpty = (childNode: AST) => childNode.text.match(/\S/) || childNode.type === 'label' || childNode.type === 'ref' || childNode.type === 'tip'
                const startTrim = curr_paragraph_nodes.findIndex(matchNonEmpty)
                const endTrim = curr_paragraph_nodes.length - 1 - curr_paragraph_nodes.findIndex((_, index, array) => matchNonEmpty(array[curr_paragraph_nodes.length - 1 - index]))


                // whole thing is empty, don't need it
                if (startTrim === -1) {
                    // console.log('FINAL PARAGRAPH_empty')
                    // console.log('-------')
                    curr_paragraph_nodes = []
                    return
                }

                // there's just 1 non-empty node
                if (startTrim === endTrim) {
                    const trimmedNode = { ...curr_paragraph_nodes[startTrim], text: curr_paragraph_nodes[startTrim].text.trim() }
                    contents.push({ nodes: [trimmedNode], isParagraph: true })
                    // console.log('FINAL PARAGRAPH_TRIM_SINGLE', startTrim, [trimmedNode])
                    // console.log('-------')
                    curr_paragraph_nodes = []
                    return
                }

                let trimmed_curr_paragraph_nodes: AST[] = []
                trimmed_curr_paragraph_nodes.push({ ...curr_paragraph_nodes[startTrim], text: curr_paragraph_nodes[startTrim].text.trimStart() })
                trimmed_curr_paragraph_nodes.push(...curr_paragraph_nodes.slice(startTrim + 1, endTrim))
                trimmed_curr_paragraph_nodes.push({ ...curr_paragraph_nodes[endTrim], text: curr_paragraph_nodes[endTrim].text.trimEnd() })

                // console.log('FINAL PARAGRAPH_TRIM_MANY', startTrim, endTrim, trimmed_curr_paragraph_nodes)
                // console.log('-------')

                contents.push({ nodes: trimmed_curr_paragraph_nodes, isParagraph: true })
                curr_paragraph_nodes = []
            }

            const paragraphBreakers = ['image']
            for (let [index, childNode] of ASTNode.children.entries()) {
                if (paragraphBreakers.includes(childNode.type)) {
                    flush_curr_paragraph()
                    contents.push({ nodes: [childNode], isParagraph: false })
                    continue
                }
                curr_paragraph_nodes.push(childNode)
            }
            flush_curr_paragraph()
            ASTNode.metadata.paragraphs = contents
        },


        getHTML: (props) => {
            const { ASTNode, context } = props
            const { inArgs, asOutline } = context
            const { metadata: { assignedID, paragraphs }, } = ASTNode
            if (asOutline && !inArgs)
                return null


            return paragraphs!.map((content, index) => {
                const isParagraph = content.isParagraph

                let childHTML: React.ReactNode = content.nodes.map((node, index) => <Fragment key={index}>{ChildComponent(node, props)}</Fragment>)
                if (isParagraph)
                    childHTML = <Paragraph isSelectable={true} paragraphify={!inArgs} paragraphID={assignedID}>
                        {childHTML}
                    </Paragraph>

                // the space is for separating multiple paragraphs which are all !paragraph, which natually get pushed right next to each other
                return <Fragment key={index}>
                    {childHTML}{' '}
                </Fragment>
            })

        },
    },


    /**
     *  \link{YOUR_TEXT_HERE}
     */
    'link': {
        theseCanBeCreatedAsDirectChildren: ['text'],
        createSubstring: `\\link{`,
        exitSubstring: `}`,
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: (props) => {
            const { ASTNode, context } = props
            let [link = '', name = ''] = ASTNode.text.split(',')

            link = link.trim()
            name = name.trim()

            // this is deriveit's way of getting the name and the link if you create this AST node by typing \link{/coding/215} 
            // const internalNote = link.match(/^\/coding\/([0-9]+)((?:#|\?).*)?$/)
            // if (internalNote) {
            //     const nid = internalNote[1] as unknown as number
            //     const query: string | undefined = internalNote[2]

            //     let title = name || titleOfNid(nid)
            //     link = pathnameOfNid(nid, undefined) + (query ?? '')
            //     return <Link target='_self' href={link}><Text span>{title}</Text></Link>
            // }

            //   https://   (www.)?   (google)  .  (com)   (/ = \b)   (...)
            if (!link.match(/^https:\/\/(www\.)?[\-\w\@\:\%\.\+\~\#\=]{2,256}\.[a-z]{2,6}\b([-\w\@\:\%\+\.\~\#\?\&\/\=]*)$/))
                return CustomErrorHTML(`<[${link}] not a valid URL>`)

            if (!context.inArgs)
                return <Link target='_self' href={link}><Text span>{name || link}</Text></Link>

            // if (link.match(/https:\/\/(www\.)?deriveit.org\/notes/(.*)/))
            // TODO! can show a preview of that note

            return <Text underline component='span'>{name || link}</Text>
        },

    },

    'math': {
        theseCanBeCreatedAsDirectChildren: ['text'],

        createSubstring: `$`,
        exitSubstring: `$`,
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: ({ ASTNode }) => (<MathErrorBoundary><InlineMath>{ASTNode.text}</InlineMath></MathErrorBoundary>),
    },

    'bigmath': {
        theseCanBeCreatedAsDirectChildren: ['text', 'label'],

        createSubstring: `$$`,
        exitSubstring: `$$`,
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        typeMetadata: {
            desiredIDFn: ({ ASTNode }) => `Equation-${ASTNode.text}`,
            canBeLabeled: {
                stampHTML: (count) => count && `(${count})`,
                stampCountKey: 'default',
            },
        },


        getHTML: (props) => {
            const { ASTNode, context } = props
            if (context.asOutline)
                return null

            const count = ASTNode.metadata.stampCount
            let tagKATEX = count ? `\\tag{${count}}` : '\\notag ' // this takes the place of 'stamp'
            // https://katex.org/docs/options.html - see if there's a notag, and always disable \tag
            // https://katex.org/docs/security.html - SEE THIS - TODO! add \notag to \begin{<>} \notag \end{<>}??

            const mathHTML = (<div id={ASTNode.metadata.assignedID} className={'selectable'}>
                <MathErrorBoundary><BlockMath>{tagKATEX + ASTNode.text}</BlockMath></MathErrorBoundary>
            </div>)

            const errorHTML = ChildrenErrorHTML(ASTNode, props)

            return (<ScrollArea type='auto'>
                {mathHTML}
                {errorHTML}
            </ScrollArea>)
        },
    },

    'code': {
        theseCanBeCreatedAsDirectChildren: ['text'],

        createSubstring: "`",
        exitSubstring: "`",
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: (props) => {
            const { ASTNode, context } = props
            if (context.asOutline)
                return null
            return <Box component='span' py={1} px={2} sx={theme => ({ position: 'relative', borderRadius: '2px', border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[4]}`, backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[1] })}>
                <Box component='code' sx={(theme) => ({ fontFamily: `'Consolas', ${theme.fontFamilyMonospace}, courier, monospace`, })}>{ChildrenComponents(props)}</Box>
            </Box>
        },
    },


    'pseudocode': {
        theseCanBeCreatedAsDirectChildren: ['text'],

        createSubstring: "``",
        exitSubstring: "``",
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: (props) => {
            const { ASTNode, context } = props

            if (context.asOutline)
                return null

            const code = ASTNode.text.trim()
            return <BigCode key={code} height='auto' initCode={code} language='python' isPseudocode={true} />
        }
    },


    'bigcode': {
        theseCanBeCreatedAsDirectChildren: ['text'],

        createSubstring: "```",
        exitSubstring: "```",
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: (props) => {
            const { ASTNode, context } = props

            if (context.asOutline)
                return null

            const code = ASTNode.text.trim()
            return <BigCode key={code} height='auto' initCode={code} language='python' isPseudocode={false} />
        },
    },



    // TODO! don't allow infinite nesting of \detail
    'detail': {
        theseCanBeCreatedAsDirectChildren: ['block'],

        createSubstring: `\\detail{`,
        exitSubstring: "}",
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: (props) => {
            const { context } = props
            if (context.asOutline)
                return null
            return <DetailComponent props={props}>{ChildrenComponents(props)}</DetailComponent>
        },
    },


    'spoiler': {
        theseCanBeCreatedAsDirectChildren: ['block'],
        createSubstring: `\\spoiler{`,
        exitSubstring: "}",
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML(props) {
            if (props.context.asOutline)
                return null
            return <SpoilerComponent props={props}>{ChildrenComponents(props)}</SpoilerComponent>
        },


    },

    'bold': {
        theseCanBeCreatedAsDirectChildren: ['text'],

        createSubstring: `\\b{`,
        exitSubstring: '}',
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: ({ ASTNode }) => (<b>{ASTNode.text}</b>),
    },
    'italics': {
        theseCanBeCreatedAsDirectChildren: ['text'],

        createSubstring: `\\i{`,
        exitSubstring: '}',
        mustExitWithExitSubstring: true,
        canReuseExitSubstringAsCreateSubstring: false,

        getHTML: ({ ASTNode }) => (<i>{ASTNode.text}</i>),
    },



    // // TODO!!! incorporate table
    // 'table_header': {
    //     theseCanBeCreatedAsDirectChildren: ['table_entry'],
    //     createSubstring: '\n|',
    //     exitSubstring: '|\n',
    // },
    // 'table_row': {
    //     theseCanBeCreatedAsDirectChildren: ['table_entry'],
    //     createSubstring: '\n|',
    //     exitSubstring: '|\n',

    // },
    // 'table_entry': {
    //     theseCanBeCreatedAsDirectChildren: ['inline'],
    //     createSubstring: '|',
    //     exitSubstring: '|',
    //     mustExitWithExitSubstring: false,
    //     canReuseExitSubstringAsCreateSubstring: true,

    //     // doNotExitUpToMatchThis: true, // TODO!

    // },
    // 'table': {
    //     theseCanBeCreatedAsDirectChildren: ['table_header', 'table_row'],
    //     theseDirectChildrenCanCreateThisAsParent: ['table_header'],

    //     getHTML: ({ ASTNode, childrenHTML }) => childrenHTML,
    // },



}

export default default_schema