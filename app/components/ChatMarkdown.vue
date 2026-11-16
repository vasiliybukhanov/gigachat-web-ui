<script setup lang="ts">
const props = defineProps<{
  text: string
  streaming?: boolean
}>()

const html = computed(() => renderMarkdown(props.text))
</script>

<template>
  <div class="chat-md" :class="{ streaming }" v-html="html" />
</template>

<style lang="css">
.chat-md {
  font-size: 15px;
  line-height: 1.55;
}
.chat-md > :first-child {
  margin-top: 0;
}
.chat-md > :last-child {
  margin-bottom: 0;
}
.chat-md h1,
.chat-md h2,
.chat-md h3,
.chat-md h4,
.chat-md h5,
.chat-md h6 {
  margin: 18px 0 8px;
  line-height: 1.3;
  font-weight: 650;
}
.chat-md h1 {
  font-size: 1.35em;
}
.chat-md h2 {
  font-size: 1.25em;
}
.chat-md h3 {
  font-size: 1.12em;
}
.chat-md h4,
.chat-md h5,
.chat-md h6 {
  font-size: 1em;
}
.chat-md p {
  margin: 0 0 10px;
}
.chat-md ul,
.chat-md ol {
  margin: 0 0 10px;
  padding-left: 22px;
}
.chat-md li {
  margin: 2px 0;
}
.chat-md li > p {
  margin: 0;
}
.chat-md code {
  padding: 2px 6px;
  background: #f1f3f7;
  border-radius: 6px;
  font-family: ui-monospace, Consolas, 'Cascadia Code', monospace;
  font-size: 0.92em;
}
.chat-md pre {
  margin: 0 0 10px;
  padding: 12px 14px;
  background: #f6f8fa;
  border: 1px solid #e4e7ee;
  border-radius: 12px;
  overflow-x: auto;
}
.chat-md pre code {
  padding: 0;
  background: none;
  border-radius: 0;
  font-size: 13px;
}
.chat-md blockquote {
  margin: 0 0 10px;
  padding: 4px 14px;
  border-left: 3px solid #dfe1e7;
  color: #5f6472;
}
.chat-md table {
  display: block;
  max-width: 100%;
  margin: 0 0 10px;
  border-collapse: collapse;
  overflow-x: auto;
}
.chat-md th,
.chat-md td {
  padding: 6px 10px;
  border: 1px solid #e4e7ee;
  text-align: left;
}
.chat-md th {
  background: #f6f8fa;
  font-weight: 600;
}
.chat-md a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.chat-md hr {
  margin: 14px 0;
  border: none;
  border-top: 1px solid #e4e7ee;
}
.chat-md img {
  max-width: 100%;
  border-radius: 12px;
}
.chat-md.streaming:empty::after,
.chat-md.streaming > :last-child::after {
  content: '▍';
  animation: chat-md-blink 1s infinite;
}
@keyframes chat-md-blink {
  50% {
    opacity: 0;
  }
}
</style>
