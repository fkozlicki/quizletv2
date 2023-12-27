import type { Flashcard } from "@prisma/client";
import { Progress } from "antd";
import type { SwitchChangeEventHandler } from "antd/es/switch";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import FlashcardButtons from "./FlashcardButtons";
import FlipCard from "./FlipCard";
import StudyModeResult from "../shared/StudyModeResult";
import FlashcardsSettingsModal from "./FlashcardsSettingsModal";
import { boolean } from "zod";

export type FlashcardAnimation = "left" | "right" | "know" | "learning";

interface FlashcardsGameProps {
  cards: Flashcard[];
  ownerId: string;
  setId: string;
  size?: "small" | "large";
}

const FlashcardsGame = ({
  cards,
  ownerId,
  setId,
  size = "small",
}: FlashcardsGameProps) => {
  const { push } = useRouter();
  const { data: session } = useSession();
  const [flashcards, setFlashcards] = useState<Flashcard[]>(cards);
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [moveAnimation, setMoveAnimation] =
    useState<FlashcardAnimation>("right");
  const currentCard = flashcards[cardIndex];
  const [hard, setHard] = useState<Flashcard[]>([]);
  const cardWrapper = useRef<HTMLDivElement>(null);
  const animationCardWrapper = useRef<HTMLDivElement>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [sorting, setSorting] = useState<boolean>(false);

  useEffect(() => {
    setFlashcards(cards);
  }, [cards]);

  const animateScoreCard = (variant: "learning" | "know") => {
    const { current } = animationCardWrapper;
    if (!current) return;

    const animationName =
      variant === "learning" ? "animate-learning" : "animate-know";

    current.classList.remove("animate-learning", "animate-know");
    // -> triggering animation reflow
    void current.offsetWidth;

    current.classList.add(animationName);
  };

  const animateSlide = (variant: "left" | "right") => {
    const { current } = cardWrapper;
    if (!current) return;

    const animationName =
      variant === "left" ? "animate-slideLeft" : "animate-slideRight";

    current.classList.remove("animate-slideLeft", "animate-slideRight");
    // -> triggering animation reflow
    void current.offsetWidth;

    current.classList.add(animationName);
  };

  const changeCard = (value: -1 | 1) => {
    if (
      (value === -1 && cardIndex === 0) ||
      (value === 1 && cardIndex === cards.length)
    ) {
      return;
    }
    setCardIndex((prev) => prev + value);
  };

  const resetFlashcards = () => {
    setHard([]);
    setFlashcards(cards);
    setCardIndex(0);
  };

  const reviewToughTerms = () => {
    setFlashcards(hard);
    setCardIndex(0);
  };

  const learnFlashcards = async () => {
    await push(`/study-set/${setId}/learn`);
  };

  const addToHard = () => {
    if (!currentCard) {
      return;
    }
    setHard((prev) => [...prev, currentCard]);
  };

  const backToStudySet = async () => {
    await push(`/study-set/${setId}`);
  };

  const handleLeft = () => {
    if (sorting) {
      setMoveAnimation("learning");
      animateScoreCard("learning");
      addToHard();
      changeCard(1);
    } else {
      setMoveAnimation("left");
      animateSlide("left");
      changeCard(-1);
    }
  };

  const handleRight = () => {
    if (sorting) {
      setMoveAnimation("know");
      animateScoreCard("know");
    } else {
      setMoveAnimation("right");
      animateSlide("right");
    }
    changeCard(1);
  };

  const openSettingsModal = () => {
    setSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setSettingsModalOpen(false);
  };

  const switchSorting = (value: boolean) => {
    setSorting(value);
  };

  const firstButton = {
    text:
      hard.length > 0
        ? "Review the tough terms"
        : size === "small"
        ? "Learn flashcards"
        : "Back to set",
    description:
      hard.length > 0
        ? `Review Flashcards again with the ${hard.length} terms you're still learing.`
        : size === "small"
        ? "Learn flashcards"
        : "Get back to the study set.",
    callback:
      hard.length > 0
        ? reviewToughTerms
        : size === "small"
        ? learnFlashcards
        : backToStudySet,
    Icon: (
      <Image
        src={size === "small" ? "/study.png" : "/back.svg"}
        alt=""
        width={48}
        height={48}
      />
    ),
  };

  const secondButton = {
    text: "Reset Flashcards",
    description: `Study all ${cards.length} terms from the beginning.`,
    callback: resetFlashcards,
    Icon: <Image src="/back.svg" alt="" width={48} height={48} />,
  };

  return currentCard ? (
    <>
      <FlipCard
        size={size}
        flashcard={currentCard}
        editable={ownerId === session?.user.id}
        moveAnimation={moveAnimation}
        cardWrapper={cardWrapper}
        animationCardWrapper={animationCardWrapper}
      />
      <FlashcardButtons
        setId={setId}
        cardCount={flashcards.length}
        cardIndex={cardIndex}
        handleLeft={handleLeft}
        handleRight={handleRight}
        sorting={sorting}
        openSettingsModal={openSettingsModal}
      />
      <Progress
        percent={(cardIndex / cards.length) * 100}
        showInfo={false}
        size="small"
        className="mb-6"
      />
      <FlashcardsSettingsModal
        open={settingsModalOpen}
        onCancel={closeSettingsModal}
        sorting={sorting}
        switchSorting={switchSorting}
        resetFlashcards={resetFlashcards}
      />
    </>
  ) : (
    <StudyModeResult
      hard={hard.length}
      cardCount={cards.length}
      firstButton={firstButton}
      secondButton={secondButton}
    />
  );
};

export default FlashcardsGame;
