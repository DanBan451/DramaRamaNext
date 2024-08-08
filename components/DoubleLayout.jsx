import Image from 'next/image';
import { Container, Button } from '@nextui-org/react';

const DoubleLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-1536px w-full mx-auto">
        <Container className="my-8 mx-auto flex flex-col lg:flex-row lg:space-x-8">
          <Item imageSrc="/images/image1.png" />
          <Item imageSrc="/images/image2.png" />
        </Container>
      </div>
    </div>
  );
};

const Item = ({ imageSrc }) => {
  return (
    <div className="flex flex-col items-center bg-white shadow-lg rounded-lg p-6 mb-6 lg:mb-0 lg:max-w-none">
      <div className="relative w-full max-w-full h-64 mb-4">
        <Image
          src={imageSrc}                    
          alt="Item Image"
          layout="fill"
          objectFit="cover"
          className="rounded-t-lg"
        />
      </div>
      <h3 className="text-xl font-bold mb-2 text-center">
        Item Header
      </h3>
      <p className="text-base mb-4 text-center">
        This is the paragraph text for the item. It gives a brief description.
      </p>
      <Button className="bg-red-500 text-white w-full max-w-xs">
        Red Button
      </Button>
    </div>
  );
};

export default DoubleLayout;
