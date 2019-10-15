<script>
  import { onDestroy, createEventDispatcher } from "svelte";
  import Button from "../UI/Button.svelte";
  import TextInput from "../UI/TextInput.svelte";
  import places from "./place-store.js";

  import Modal from "../UI/Modal.svelte";
  let title = "Edit Place";
  const dispatch = createEventDispatcher();

  export let id = null;

  let name = "";
  let type = "";
  let description = "";
  let imageUrl = "";
  let address = "";
  let contactEmail = "";

  if (id) {
    const unsubscribe = places.subscribe(places => {
      const place = places.find(p => p.id === id);
      if (place) {
        ({ name, type, description, imageUrl, address, contactEmail } = place);
      }
    });
    onDestroy(() => {
      unsubscribe();
    });
  }

  function submitForm(event) {}
</script>

<style>

</style>

<Modal {title} on:onModalclose>
  <form on:submit={submitForm}>
    <TextInput
      controlType="text"
      id="name"
      label="Name"
      value={name}
      on:input={event => (name = event.target.value)} />
    <TextInput
      controlType="text"
      id="type"
      label="Type"
      value={type}
      on:input={event => (type = event.target.value)} />
    <TextInput
      controlType="textarea"
      id="description"
      label="Description"
      rows={3}
      value={description}
      on:bind={description} />
    <TextInput
      controlType="text"
      id="imageUrl"
      label="imageUrl"
      value={imageUrl}
      on:input={event => (imageUrl = event.target.value)} />
    <TextInput
      controlType="text"
      id="address"
      label="Address"
      value={address}
      on:input={event => (address = event.target.value)} />
    <TextInput
      controlType="text"
      type="email"
      id="contactEmail"
      label="Email"
      value={contactEmail}
      on:input={event => (contactEmail = event.target.value)} />

  </form>

  <div slot="footer">
    <Button mode="outline" on:click={() => dispatch('onModalclose')}>
      Close
    </Button>
    <Button on:click={() => dispatch('onModalclose')}>Save</Button>
  </div>
</Modal>
