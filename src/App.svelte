<script>
  import Header from "./UI/Header.svelte";
  import PlacesView from "./places/PlacesView.svelte";
  import PlaceDetails from "./places/PlaceDetails.svelte";
  import places from "./places/place-store.js";

  let mainView = "places-view";
  let placeId;

  function showDetails(event) {
    console.log(event);
    placeId = event.detail;
    mainView = "details-view";
  }

  function closeDetails() {
    mainView = "places-view";
    placeId = null;
  }
</script>

<style>
  main {
    margin-top: 5rem;
  }
</style>

<Header />
<main>
  {#if mainView === 'places-view'}
    <PlacesView places={$places} on:showDetails={showDetails} on:edit />
  {:else if mainView === 'details-view'}
    <PlaceDetails id={placeId} on:close={closeDetails} />
  {/if}
</main>
