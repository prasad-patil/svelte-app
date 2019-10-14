<script>
  import PlaceItem from "./PlaceItem.svelte";
  import Button from "../UI/Button.svelte";

  export let places;
</script>

<style>
  #places {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    grid-gap: 1rem;
  }

  .place-view-control {
    margin: 1rem;
    display: flex;
    justify-content: space-between;
  }

  @media (min-width: 768px) {
    #places {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>

<section class="place-view-control">
  <Button>Add New Place</Button>
</section>
<section id="places">
  {#each places as place}
    <PlaceItem {...place} on:showDetails on:edit />
  {/each}

</section>
