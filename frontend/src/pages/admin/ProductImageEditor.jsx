import ImageFramer from '../../components/admin/ImageFramer';

/** The two shapes a product photo is shown in: the 3:4 card and the 4:5 product page. */
const PRODUCT_FRAMES = [
  { key: 'card', label: 'Product card', aspect: 'aspect-[3/4]', frameClass: 'mx-auto w-full max-w-[15rem] sm:max-w-[17rem]' },
  { key: 'detail', label: 'Product page', aspect: 'aspect-[4/5]', frameClass: 'mx-auto w-full max-w-[15rem] sm:max-w-[17rem]' },
];

export default function ProductImageEditor({ image, onClose, onSave }) {
  return (
    <ImageFramer
      image={image}
      frames={PRODUCT_FRAMES}
      description="Drag the photo to adjust how it is framed in the store."
      onClose={onClose}
      onSave={onSave}
    />
  );
}
