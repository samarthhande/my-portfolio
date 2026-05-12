import Npc from '@assets/js/GameEnginev1.1/essentials/Npc.js';

class StrictNpc extends Npc {
    isPlayerColliding(player) {
        if (!player || !this.canvas || !player.canvas) return false;
        try {
            this.isCollision(player);
            return !!this.collisionData?.hit;
        } catch (error) {
            return false;
        }
    }

    handleKeyInteract() {
        if (this.gameEnv.gameControl && this.gameEnv.gameControl.isPaused) {
            return;
        }

        if (this.dialogueSystem && this.dialogueSystem.isDialogueOpen()) {
            this.dialogueSystem.closeDialogue();
            return;
        }

        const player = this.gameEnv?.gameObjects?.find(
            (obj) => obj && obj.constructor?.name === 'Player'
        );
        const hasInteract = this.interact !== undefined;

        if (player && hasInteract && !this.isInteracting && this.isPlayerColliding(player)) {
            this.isInteracting = true;

            const originalInteract = this.interact;
            originalInteract.call(this);

            if (this.gameEnv && this.gameEnv.gameControl && !this.gameEnv.gameControl.isPaused) {
                setTimeout(() => {
                    this.isInteracting = false;
                }, 500);
            }
        }
    }
}

export default StrictNpc;
