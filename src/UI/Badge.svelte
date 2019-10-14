<script>
  import { slide } from "svelte/transition";
</script>

<style>
  span {
    display: inline-block;
    margin: 0 0.25rem;
    border-radius: 3px;
    border: 1px solid #1976d2;
    background: #1976d2;
    color: white;
    padding: 0 0.5rem;
    font-family: "Lato", sans-serif;
    font-size: 0.8rem;
  }
</style>

<span transition:slide>
  <slot />
</span>
