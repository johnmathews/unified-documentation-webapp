# Fix: Chat conversation lost when closing sidebar

## Bug

Closing the chat sidebar cleared the conversation history — same effect as
clicking "Clear chat". Reopening the sidebar showed a fresh empty chat.

## Root Cause

The layout used `{#if chatOpen}` to conditionally render the `ChatPanel`
component. When `chatOpen` became false, Svelte destroyed the component and
all its state (the `messages` array). Reopening created a new instance with
empty messages.

## Fix

Replaced `{#if chatOpen}` with a CSS `display: none` approach: the
`ChatPanel` is always mounted but hidden via a `.hidden` class when closed.
This preserves component state (conversation history, scroll position) across
open/close toggles. Only the "Clear chat" button resets the conversation.
