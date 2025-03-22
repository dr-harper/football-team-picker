export const positionsByTeamSizeAndSide: {
    [key: number]: { left: { top: string; left: string }[]; right: { top: string; left: string }[] };
} = {
    5: {
        left: [
            { top: '50%', left: '10%' }, // Goalkeeper
            { top: '30%', left: '25%' }, // Defender 1
            { top: '70%', left: '25%' }, // Defender 2
            { top: '30%', left: '40%' }, // Midfielder
            { top: '70%', left: '40%' }, // Striker
        ],
        right: [
            { top: '50%', left: '90%' }, // Goalkeeper
            { top: '30%', left: '75%' }, // Defender 1
            { top: '70%', left: '75%' }, // Defender 2
            { top: '30%', left: '60%' }, // Midfielder
            { top: '70%', left: '60%' }, // Striker
        ],
    },
    6: {
        left: [
            { top: '50%', left: '10%' }, // Goalkeeper
            { top: '30%', left: '25%' }, // Defender 1
            { top: '70%', left: '25%' }, // Defender 2
            { top: '20%', left: '40%' }, // Midfielder 1
            { top: '80%', left: '40%' }, // Midfielder 2
            { top: '50%', left: '40%' }, // Striker
        ],
        right: [
            { top: '50%', left: '90%' }, // Goalkeeper
            { top: '30%', left: '75%' }, // Defender 1
            { top: '70%', left: '75%' }, // Defender 2
            { top: '20%', left: '60%' }, // Midfielder 1
            { top: '80%', left: '60%' }, // Midfielder 2
            { top: '50%', left: '60%' }, // Striker
        ],
    },
    7: {
        left: [
            { top: '50%', left: '10%' }, // Goalkeeper
            { top: '20%', left: '25%' }, // Defender 1
            { top: '50%', left: '25%' }, // Defender 2
            { top: '80%', left: '25%' }, // Defender 3
            { top: '20%', left: '42%' }, // Striker 1
            { top: '50%', left: '42%' }, // Striker 2
            { top: '80%', left: '42%' }, // Striker 3
        ],
        right: [
            { top: '50%', left: '90%' }, // Goalkeeper
            { top: '20%', left: '75%' }, // Defender 1
            { top: '50%', left: '75%' }, // Defender 2
            { top: '80%', left: '75%' }, // Defender 3
            { top: '20%', left: '57%' }, // Striker 1
            { top: '50%', left: '57%' }, // Striker 2
            { top: '80%', left: '57%' }, // Striker 3
        ],
    },
    8: {
        left: [
            { top: '50%', left: '10%' }, // Goalkeeper
            { top: '25%', left: '20%' }, // Defender 1
            { top: '75%', left: '20%' }, // Defender 2
            { top: '40%', left: '30%' }, // Midfielder 1
            { top: '60%', left: '30%' }, // Midfielder 2
            { top: '20%', left: '45%' }, // Midfielder 3
            { top: '80%', left: '45%' }, // Midfielder 4
            { top: '50%', left: '50%' }, // Striker
        ],
        right: [
            { top: '50%', left: '90%' }, // Goalkeeper
            { top: '25%', left: '80%' }, // Defender 1
            { top: '75%', left: '80%' }, // Defender 2
            { top: '40%', left: '70%' }, // Midfielder 1
            { top: '60%', left: '70%' }, // Midfielder 2
            { top: '20%', left: '55%' }, // Midfielder 3
            { top: '80%', left: '55%' }, // Midfielder 4
            { top: '50%', left: '50%' }, // Striker
        ],
    },
};

export const placeholderPositions = {
    left: [
        { top: '53%', left: '10%' }, // Goalkeeper
        { top: '30%', left: '25%' }, // Defender 1
        { top: '78%', left: '25%' }, // Defender 2
        { top: '40%', left: '40%' }, // Midfielder
        { top: '70%', left: '40%' }, // Striker
    ],
    right: [
        { top: '53%', left: '90%' }, // Goalkeeper
        { top: '30%', left: '75%' }, // Defender 1
        { top: '78%', left: '75%' }, // Defender 2
        { top: '40%', left: '60%' }, // Midfielder
        { top: '70%', left: '60%' }, // Striker
    ],
};
