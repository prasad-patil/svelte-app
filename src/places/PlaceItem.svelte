<script>
  import { createEventDispatcher } from "svelte";
  import places from "./place-store.js";
  import Button from "../UI/Button.svelte";
  import Badge from "../UI/Badge.svelte";

  export let id;
  export let name;
  export let type;
  export let imageUrl;
  export let description;
  export let address;
  export let contactEmail;
  export let isFavorite;

  const dispatch = createEventDispatcher();

  function toggleFavorite() {
    places.toggleFavorite(id);
  }

  function someThing() {
    console.log(id);
    dispatch("showDetails", id);
  }
</script>

<style>
  article {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.26);
    border-radius: 5px;
    background: white;
    margin: 1rem;
  }

  header,
  .content,
  footer {
    padding: 1rem;
  }

  .image {
    width: 100%;
    height: 14rem;
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  h1 {
    font-size: 1.25rem;
    margin: 0.5rem 0;
  }

  h2 {
    font-size: 1rem;
    color: #808080;
    margin: 0.5rem 0;
  }

  p {
    font-size: 1.25rem;
    margin: 0;
  }

  div {
    text-align: right;
  }

  .content {
    height: 4rem;
  }

  .fav-icon {
    float: right;
  }
</style>

<article>
  <header>
    <h1>
      {name}
      {#if isFavorite}
        <i class="fa fa-star fav-icon" on:click={toggleFavorite} />
      {:else}
        <i class="fa fa-star fav-icon accent-color" on:click={toggleFavorite} />
      {/if}
    </h1>
    <h2>{type}</h2>
    <p>{address}</p>
  </header>
  <div class="image">
    <img src={imageUrl} alt={name} />
  </div>
  <div class="content">
    <p>{description}</p>
  </div>
  <footer>
    <Button mode="outline" type="button" on:click={() => dispatch('edit', id)}>
      Edit
    </Button>
    <Button type="button" on:click={() => dispatch('showDetails', id)}>
      Show Details
    </Button>
  </footer>
</article>
