<script lang="ts">
  import { Moment } from "moment";
  import { getContext } from "svelte";
  import { Writable } from "svelte/store";

  import {
    dateRangeContextKey,
    unscheduledTasksMaxHeight,
    unscheduledTasksMinHeight,
  } from "../../constants";
  import { getVisibleHours } from "../../global-store/derived-settings";
  import { settings } from "../../global-store/settings";

  import GlobalHandlers from "./global-handlers.svelte";
  import ResizeHandle from "./resize-handle.svelte";
  import ResizeableBox from "./resizeable-box.svelte";
  import Ruler from "./ruler.svelte";
  import Scroller from "./scroller.svelte";
  import TimelineControls from "./timeline-controls.svelte";
  import Timeline from "./timeline.svelte";
  import UnscheduledTaskContainer from "./unscheduled-task-container.svelte";

  export let day: Moment | undefined = undefined;

  const dateRange = getContext<Writable<Moment[]>>(dateRangeContextKey);

  // todo: refactor to remove this one
  $: actualDay = day || $dateRange[0];
</script>

<GlobalHandlers />

<div class="controls">
  <TimelineControls />
  <ResizeableBox
    maxHeight={unscheduledTasksMaxHeight}
    minHeight={unscheduledTasksMinHeight}
    let:startEdit
  >
    <UnscheduledTaskContainer day={actualDay} />
    <ResizeHandle on:mousedown={startEdit} />
  </ResizeableBox>
</div>
<Scroller let:hovering={autoScrollBlocked}>
  <Ruler visibleHours={getVisibleHours($settings)} />
  <Timeline day={actualDay} isUnderCursor={autoScrollBlocked} />
</Scroller>

<style>
  .controls {
    position: relative;
    z-index: 1000;
    box-shadow: var(--shadow-bottom);
  }

  .controls > :global(*) {
    border-bottom: 1px solid var(--background-modifier-border);
  }
</style>
