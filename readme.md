Projet Buzzer:

# Contexte et définition du problème

Site simple de buzzer en ligne. Demande effectuée par besoin d'un outil de ce type pour des quiz en distanciel effectué en vocal.

# Fonctionnalités

- création d'un salon joignable via un code
- pas besoin de connexion ou de compte. uniquement d'un petit formulaire le pseudo ou autre pour l'identication de la personne dans le salon
- 2 types d'utilisateurs: les participants et le gérant du salon
    - l'utilisateur qui crée le salon devient le gérant du salon. Il ne buzze pas mais gère le reset du buzzer et l'attribution des points.
    - le participant ne peut que buzzer
- fonctionnement du buzzer: un participant appuie (en premier) sur un buzzer. Personne ne peut appuyer dessus. On affiche le pseudo qui à appuyer (et a donc la parole). Du côté du gérant, dès que le buzzer est appuyé, il a le pseudo qui s'affiche, un bouton pour reset le buzzer sans attribution de points et un bouton qui valide et donc attribue les points (pour l'instant on est en +1 pour chaque buzz) et un bouton de fin de partie.
- affichage des points avec un classement à la fin de la partie.
- fermeture du salon dès qu'il ne reste plus aucun participants/gérants. Si déco du gérant, le salon et la partie n'est pas finie pour éviter de tout perdre.


rappel des points en haut (droite ou gauche) pendant la partie ?