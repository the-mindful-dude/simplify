import '../../../test/dom-setup';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Dialog } from './Dialog';

afterEach(cleanup);

function renderDialog() {
  return render(
    <Dialog>
      <Dialog.Trigger>Open settings</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Confirm settings</Dialog.Title>
          <Dialog.Description>Changes are saved immediately.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close>Done</Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>,
  );
}

describe('Dialog', () => {
  it('opens from its trigger with an accessible name and description', async () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));

    const dialog = await screen.findByRole('dialog', { name: 'Confirm settings' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(screen.getByText('Changes are saved immediately.')).toBeInTheDocument();
  });

  it('closes with Escape and restores focus to the trigger', async () => {
    renderDialog();
    const trigger = screen.getByRole('button', { name: 'Open settings' });

    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes via the built-in close control and forwards a ref to content', async () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Dialog>
        <Dialog.Trigger>Open dialog</Dialog.Trigger>
        <Dialog.Content ref={ref} size="sm" showClose>
          <Dialog.Title>Small dialog</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    const dialog = await screen.findByRole('dialog', { name: 'Small dialog' });
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute('data-size', 'sm');

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
